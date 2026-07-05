import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AcceptInvitationInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@ligas/contracts";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import { loadEnv } from "../config/env";
import { MailService } from "../infrastructure/mail.service";
import { PrismaService } from "../infrastructure/prisma.service";
import { TokensService } from "./tokens.service";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

@Injectable()
export class AuthService {
  private readonly env = loadEnv();
  private readonly google = this.env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(this.env.GOOGLE_CLIENT_ID)
    : null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  /** Registro de organizador: usuario + organización + rol, transaccional. */
  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException("Ya existe una cuenta con este correo");

    const baseSlug = slugify(input.organizationName);
    const collision = await this.prisma.organization.findUnique({ where: { slug: baseSlug } });
    const slug = collision ? `${baseSlug}-${randomBytes(3).toString("hex")}` : baseSlug;

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
      const org = await tx.organization.create({
        data: { name: input.organizationName, slug },
      });
      await tx.membership.create({
        data: { userId: created.id, organizationId: org.id, role: "LEAGUE_ADMIN" },
      });
      return created;
    });

    return this.issueSession(user.id, {});
  }

  async login(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Verificación constante aunque el usuario no exista (anti-enumeración).
    const valid =
      user?.passwordHash != null && (await argon2.verify(user.passwordHash, input.password));
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException("Credenciales inválidas");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueSession(user.id, meta);
  }

  /** Login con Google: verifica el ID token y crea/enlaza la cuenta. */
  async loginWithGoogle(idToken: string, meta: { ip?: string; userAgent?: string }) {
    if (!this.google) {
      throw new BadRequestException("Google OAuth no está configurado");
    }
    const ticket = await this.google.verifyIdToken({
      idToken,
      audience: this.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException("Token de Google inválido");
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] },
    });
    if (user && !user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, avatarUrl: user.avatarUrl ?? payload.picture },
      });
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          firstName: payload.given_name ?? "Usuario",
          lastName: payload.family_name ?? "Google",
          avatarUrl: payload.picture,
        },
      });
    }
    if (!user.isActive) throw new UnauthorizedException("Cuenta desactivada");
    return this.issueSession(user.id, meta);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Respuesta idéntica exista o no (anti-enumeración).
    if (user) {
      const raw = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.tokens.hash(raw),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      await this.mail.send(
        email,
        "Restablece tu contraseña",
        `Enlace (expira en 1 hora): ${this.env.WEB_URL}/restablecer/${raw}`,
      );
    }
    return { message: "Si el correo existe, enviamos un enlace de recuperación" };
  }

  async resetPassword(input: ResetPasswordInput) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hash(input.token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException("El enlace es inválido o expiró");
    }
    const passwordHash = await argon2.hash(input.password);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      // Cambio de contraseña ⇒ cerrar todas las sesiones.
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: "Contraseña actualizada" };
  }

  /** Activa una cuenta invitada (DT/árbitro/jugador) y enlaza su perfil. */
  async acceptInvitation(input: AcceptInvitationInput) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.tokens.hash(input.token) },
    });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      throw new BadRequestException("La invitación es inválida o expiró");
    }
    const existing = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) throw new ConflictException("Ya existe una cuenta con este correo");

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
      await tx.membership.create({
        data: {
          userId: created.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
      if (invitation.playerId) {
        await tx.player.update({
          where: { id: invitation.playerId },
          data: { userId: created.id },
        });
      }
      if (invitation.refereeId) {
        await tx.referee.update({
          where: { id: invitation.refereeId },
          data: { userId: created.id },
        });
      }
      if (invitation.teamId && invitation.role === "TEAM_MANAGER") {
        await tx.teamStaff.updateMany({
          where: { teamId: invitation.teamId, userId: null, role: "COACH" },
          data: { userId: created.id },
        });
      }
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
      return created;
    });

    return this.issueSession(user.id, {});
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        globalRole: true,
        memberships: {
          select: {
            role: true,
            organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
      },
    });
    return user;
  }

  private async issueSession(userId: string, meta: { ip?: string; userAgent?: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.issueAccessToken(userId),
      this.tokens.issueRefreshToken(userId, meta),
    ]);
    return { userId, accessToken, refreshToken };
  }
}
