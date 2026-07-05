import {
  Inject,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { AccessTokenPayload } from "@ligas/contracts";
import type { Request } from "express";
import { tap, type Observable } from "rxjs";
import { PrismaService } from "../infrastructure/prisma.service";

const METHOD_ACTION = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
} as const;

/**
 * Auditoría transparente (Fase 1 §4): toda mutación exitosa registra
 * actor, entidad, acción, payload y metadata. Fire-and-forget: nunca
 * bloquea ni rompe la respuesta.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Audit");

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    const action = METHOD_ACTION[req.method as keyof typeof METHOD_ACTION];
    // Solo mutaciones autenticadas; /auth tiene su propia semántica.
    if (!action || !req.user || req.path.includes("/auth/")) return next.handle();

    const params = req.params as Record<string, string | undefined>;
    return next.handle().pipe(
      tap((response) => {
        const entityId =
          (typeof response === "object" && response !== null && "id" in response
            ? String((response as { id: unknown }).id)
            : undefined) ?? params["id"];

        void this.prisma.auditLog
          .create({
            data: {
              organizationId: params["orgId"] ?? null,
              userId: req.user!.sub,
              action,
              entity: ctx.getClass().name.replace("Controller", ""),
              entityId,
              after: (req.body ?? undefined) as object | undefined,
              ip: req.ip,
              userAgent: req.headers["user-agent"]?.slice(0, 300),
            },
          })
          .catch((e: unknown) => this.logger.warn(`No se pudo auditar: ${String(e)}`));
      }),
    );
  }
}
