import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AccessTokenPayload, OrgRole } from "@ligas/contracts";
import { loadEnv } from "../config/env";
import { PrismaService } from "../infrastructure/prisma.service";

export const REFRESH_COOKIE = "refresh_token";

/** Emisión y rotación de tokens. El refresh se guarda hasheado (SHA-256). */
@Injectable()
export class TokensService {
  private readonly env = loadEnv();

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async issueAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: true },
    });
    const orgs: Record<string, OrgRole[]> = {};
    for (const m of user.memberships) {
      (orgs[m.organizationId] ??= []).push(m.role as OrgRole);
    }
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      orgs,
    };
    return this.jwt.signAsync(payload, {
      secret: this.env.JWT_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.env.JWT_SECRET });
  }

  async issueRefreshToken(userId: string, meta: { ip?: string; userAgent?: string }) {
    const raw = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + this.env.JWT_REFRESH_TTL_DAYS * 86_400_000),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
      },
    });
    return raw;
  }

  /** Rotación: revoca el token usado y emite uno nuevo (detecta reuso). */
  async rotateRefreshToken(raw: string, meta: { ip?: string; userAgent?: string }) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesión expirada");
    }
    if (stored.revokedAt) {
      // Ventana de gracia (15 s): un reuso inmediato es casi siempre una
      // carrera legítima (multi-tab, navegación que aborta el Set-Cookie),
      // no un robo. Se emite un par nuevo sin castigar.
      const age = Date.now() - stored.revokedAt.getTime();
      if (age > 15_000) {
        // Reuso tardío de token rotado ⇒ posible robo: revocar la familia.
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedException("Sesión revocada por seguridad");
      }
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(stored.userId),
      this.issueRefreshToken(stored.userId, meta),
    ]);
    return { userId: stored.userId, accessToken, refreshToken };
  }

  async revokeRefreshToken(raw: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
