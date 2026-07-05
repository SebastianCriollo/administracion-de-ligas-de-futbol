import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { auditQuerySchema } from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId")
export class OrganizationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** KPIs del dashboard (Fase 3 §4.1). */
  @Get("dashboard")
  async dashboard(@Param("orgId") orgId: string) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const [tournaments, teams, players, referees, todayMatches, upcoming, liveCount] =
      await Promise.all([
        this.prisma.tournament.count({
          where: { organizationId: orgId, status: { in: ["PUBLISHED", "IN_PROGRESS"] } },
        }),
        this.prisma.team.count({ where: { organizationId: orgId, isActive: true } }),
        this.prisma.player.count({ where: { organizationId: orgId, isActive: true } }),
        this.prisma.referee.count({ where: { organizationId: orgId } }),
        this.prisma.match.findMany({
          where: { organizationId: orgId, scheduledAt: { gte: dayStart, lt: dayEnd } },
          include: {
            homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
            awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
            tournament: { select: { name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        }),
        this.prisma.match.count({
          where: { organizationId: orgId, status: "SCHEDULED", scheduledAt: { gte: dayEnd } },
        }),
        this.prisma.match.count({
          where: {
            organizationId: orgId,
            status: { in: ["LIVE", "HALF_TIME", "EXTRA_TIME", "PENALTIES"] },
          },
        }),
      ]);

    return {
      kpis: { tournaments, teams, players, referees, upcoming, live: liveCount },
      todayMatches,
    };
  }

  @Get("audit")
  audit(
    @Param("orgId") orgId: string,
    @Query(new ZodValidationPipe(auditQuerySchema)) q: z.infer<typeof auditQuerySchema>,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        userId: q.userId,
        entity: q.entity,
        entityId: q.entityId,
        action: q.action,
        createdAt: { gte: q.from, lte: q.to },
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
