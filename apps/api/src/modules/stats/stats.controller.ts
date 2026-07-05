import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { statsQuerySchema } from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

const GOAL_TYPES = ["GOAL", "PENALTY_GOAL"] as const; // autogol no suma al goleador

@Roles("LEAGUE_ADMIN", "REFEREE", "TEAM_MANAGER", "PLAYER")
@Controller("orgs/:orgId/tournaments/:id/stats")
export class StatsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("scorers")
  async scorers(
    @Param("orgId") orgId: string,
    @Param("id") tournamentId: string,
    @Query(new ZodValidationPipe(statsQuerySchema.omit({ tournamentId: true })))
    q: Omit<z.infer<typeof statsQuerySchema>, "tournamentId">,
  ) {
    const grouped = await this.prisma.matchEvent.groupBy({
      by: ["playerId", "teamId"],
      where: {
        type: { in: [...GOAL_TYPES] },
        playerId: { not: null },
        match: { tournamentId, organizationId: orgId },
      },
      _count: { _all: true },
      orderBy: { _count: { playerId: "desc" } },
      take: q.limit,
    });
    return this.hydrate(grouped);
  }

  @Get("cards")
  async cards(
    @Param("orgId") orgId: string,
    @Param("id") tournamentId: string,
    @Query(new ZodValidationPipe(statsQuerySchema.omit({ tournamentId: true })))
    q: Omit<z.infer<typeof statsQuerySchema>, "tournamentId">,
  ) {
    const events = await this.prisma.matchEvent.findMany({
      where: {
        type: { in: ["YELLOW_CARD", "SECOND_YELLOW", "RED_CARD"] },
        playerId: { not: null },
        match: { tournamentId, organizationId: orgId },
      },
      select: { playerId: true, teamId: true, type: true },
    });
    const acc = new Map<string, { playerId: string; teamId: string | null; yellow: number; red: number }>();
    for (const e of events) {
      const row = acc.get(e.playerId!) ?? { playerId: e.playerId!, teamId: e.teamId, yellow: 0, red: 0 };
      if (e.type === "YELLOW_CARD") row.yellow++;
      else row.red++;
      acc.set(e.playerId!, row);
    }
    const rows = [...acc.values()]
      .sort((a, b) => b.red - a.red || b.yellow - a.yellow)
      .slice(0, q.limit);
    return this.hydrate(rows);
  }

  private async hydrate<T extends { playerId: string | null; teamId: string | null }>(rows: T[]) {
    const players = await this.prisma.player.findMany({
      where: { id: { in: rows.map((r) => r.playerId!).filter(Boolean) } },
      select: { id: true, firstName: true, lastName: true, photoUrl: true },
    });
    const teams = await this.prisma.team.findMany({
      where: { id: { in: rows.map((r) => r.teamId!).filter(Boolean) } },
      select: { id: true, name: true, shortName: true, crestUrl: true },
    });
    const pMap = new Map(players.map((p) => [p.id, p]));
    const tMap = new Map(teams.map((t) => [t.id, t]));
    return rows.map((r) => ({
      ...r,
      player: r.playerId ? (pMap.get(r.playerId) ?? null) : null,
      team: r.teamId ? (tMap.get(r.teamId) ?? null) : null,
    }));
  }
}
