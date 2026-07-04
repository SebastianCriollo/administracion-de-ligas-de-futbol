import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { AccessTokenPayload, OrgRole } from "@ligas/contracts";

export const IS_PUBLIC_KEY = "isPublic";
/** Marca un endpoint como accesible sin autenticación. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
/**
 * Roles requeridos DENTRO de la organización de la ruta (param :orgId).
 * SUPER_ADMIN global siempre pasa. Sin @Roles, basta estar autenticado.
 */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);

/** Inyecta el payload del access token: @CurrentUser() user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: AccessTokenPayload }>();
    return req.user;
  },
);
