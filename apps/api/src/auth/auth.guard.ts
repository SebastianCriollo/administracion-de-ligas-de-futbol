import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AccessTokenPayload, OrgRole } from "@ligas/contracts";
import type { Request } from "express";
import { IS_PUBLIC_KEY, ROLES_KEY } from "./decorators";
import { TokensService } from "./tokens.service";

type AuthedRequest = Request & { user?: AccessTokenPayload };

/**
 * Guard global: autentica el Bearer token y aplica @Roles contra la
 * organización de la ruta (:orgId). @Public lo omite por completo.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException("Token requerido");

    try {
      req.user = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }

    const roles = this.reflector.getAllAndOverride<OrgRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    if (req.user.globalRole === "SUPER_ADMIN") return true;

    const orgId = (req.params as Record<string, string | undefined>)["orgId"];
    if (!orgId) throw new ForbiddenException("Ruta sin contexto de organización");
    const userRoles = req.user.orgs[orgId] ?? [];
    if (!roles.some((r) => userRoles.includes(r))) {
      throw new ForbiddenException("No tienes permiso para esta acción");
    }
    return true;
  }
}
