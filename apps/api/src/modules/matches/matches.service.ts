import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AccessTokenPayload,
  CreateMatchEventInput,
  MatchTransitionInput,
  closeReportSchema,
  matchQuerySchema,
} from "@ligas/contracts";
import type { Prisma } from "@ligas/database";
import {
  computeStandings,
  crossGroupQualifiers,
  seedOrder,
  transition,
  EVENT_RECORDING_STATUSES,
  type MatchStatus,
  type Tiebreaker,
} from "@ligas/domain";
import type { z } from "zod";
import { PrismaService } from "../../infrastructure/prisma.service";

const GOAL_TYPES = ["GOAL", "PENALTY_GOAL", "OWN_GOAL"] as const;
/** Puntos fair play por sanción (FIFA simplificado): menor = mejor. */
const FAIR_PLAY_POINTS: Record<string, number> = {
  YELLOW_CARD: 1,
  SECOND_YELLOW: 3,
  RED_CARD: 4,
};

@Injectable()
export class MatchesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(orgId: string, q: z.infer<typeof matchQuerySchema>) {
    return this.prisma.match.findMany({
      where: {
        organizationId: orgId,
        tournamentId: q.tournamentId,
        status: q.status,
        venueId: q.venueId,
        scheduledAt: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
        ...(q.teamId && { OR: [{ homeTeamId: q.teamId }, { awayTeamId: q.teamId }] }),
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        tournament: { select: { id: true, name: true } },
        round: { select: { name: true, number: true } },
        venue: { select: { name: true } },
      },
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 200,
    });
  }

  async get(orgId: string, id: string) {
    const match = await this.prisma.match.findFirst({
      where: { id, organizationId: orgId },
      include: {
        homeTeam: { include: { roster: { where: { leftAt: null }, include: { player: true } } } },
        awayTeam: { include: { roster: { where: { leftAt: null }, include: { player: true } } } },
        tournament: { select: { id: true, name: true, modality: true } },
        round: true,
        stage: true,
        venue: true,
        events: {
          orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
          include: {
            player: { select: { id: true, firstName: true, lastName: true } },
            secondaryPlayer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        officials: { include: { referee: true } },
        report: true,
      },
    });
    if (!match) throw new NotFoundException("Partido no encontrado");
    return match;
  }

  async schedule(
    orgId: string,
    id: string,
    input: { scheduledAt?: Date; venueId?: string },
  ) {
    await this.getOwned(orgId, id);
    return this.prisma.match.update({
      where: { id },
      data: { scheduledAt: input.scheduledAt, venueId: input.venueId },
    });
  }

  async assignOfficial(orgId: string, id: string, refereeId: string, role: string) {
    await this.getOwned(orgId, id);
    const referee = await this.prisma.referee.findFirst({
      where: { id: refereeId, organizationId: orgId },
    });
    if (!referee) throw new NotFoundException("Árbitro no encontrado");
    return this.prisma.matchOfficial.upsert({
      where: { matchId_role: { matchId: id, role: role as never } },
      create: { matchId: id, refereeId, role: role as never },
      update: { refereeId, status: "PROPOSED" },
    });
  }

  /** Máquina de estados (Fase 7) aplicada con permiso de operación. */
  async transitionMatch(
    orgId: string,
    id: string,
    input: MatchTransitionInput,
    user: AccessTokenPayload,
  ) {
    const match = await this.getOwned(orgId, id);
    await this.assertCanOperate(orgId, match.id, user);

    let next: MatchStatus;
    try {
      next = transition(match.status as MatchStatus, input.action);
    } catch {
      throw new ConflictException(
        `Transición inválida: ${input.action} desde ${match.status}`,
      );
    }
    const data: Prisma.MatchUpdateInput = { status: next };
    if (input.action === "START") data.startedAt = match.startedAt ?? new Date();
    if (["FINISH", "WALKOVER", "CANCEL"].includes(input.action)) data.finishedAt = new Date();
    if (input.action === "WALKOVER") {
      if (!input.winnerTeamId) throw new BadRequestException("W.O. requiere equipo ganador");
      const isHome = input.winnerTeamId === match.homeTeamId;
      data.homeScore = isHome ? 3 : 0; // marcador reglamentario configurable en rules
      data.awayScore = isHome ? 0 : 3;
    }

    const updated = await this.prisma.match.update({ where: { id }, data });

    // Al finalizar, materializa el marcador desde los eventos — un 0-0
    // sin eventos debe quedar como 0-0, no como null.
    if (input.action === "FINISH") await this.syncScore(updated.id);
    // W.O. es terminal: dispara recálculo y progresión sin acta.
    if (input.action === "WALKOVER") await this.afterResult(updated.id);
    return updated;
  }

  async addEvent(
    orgId: string,
    id: string,
    input: CreateMatchEventInput,
    user: AccessTokenPayload,
  ) {
    const match = await this.getOwned(orgId, id);
    await this.assertCanOperate(orgId, match.id, user);
    if (!EVENT_RECORDING_STATUSES.includes(match.status as MatchStatus)) {
      throw new ConflictException("El partido no está en juego");
    }
    if (input.teamId && input.teamId !== match.homeTeamId && input.teamId !== match.awayTeamId) {
      throw new BadRequestException("El equipo no juega este partido");
    }

    const event = await this.prisma.matchEvent.create({
      data: { matchId: id, ...input, createdById: user.sub },
    });
    await this.syncScore(id);
    return event;
  }

  async removeEvent(orgId: string, id: string, eventId: string, user: AccessTokenPayload) {
    const match = await this.getOwned(orgId, id);
    await this.assertCanOperate(orgId, match.id, user);
    if (match.report?.status === "CLOSED" || match.report?.status === "OFFICIAL") {
      throw new ConflictException("El acta está cerrada");
    }
    await this.prisma.matchEvent.delete({ where: { id: eventId } });
    await this.syncScore(id);
    return { id: eventId };
  }

  /**
   * Cierre del acta: congela el resultado y dispara los recálculos —
   * tabla, fair play y progresión de llaves (Fase 2, flujo del árbitro).
   */
  async closeReport(
    orgId: string,
    id: string,
    input: z.infer<typeof closeReportSchema>,
    user: AccessTokenPayload,
  ) {
    const match = await this.getOwned(orgId, id);
    await this.assertCanOperate(orgId, match.id, user);
    if (!["FINISHED", "WALKOVER"].includes(match.status)) {
      throw new ConflictException("El partido debe estar finalizado para cerrar el acta");
    }
    if (match.report?.status === "CLOSED" || match.report?.status === "OFFICIAL") {
      throw new ConflictException("El acta ya está cerrada");
    }

    if (input.bestPlayerId || input.attendance !== undefined) {
      await this.prisma.match.update({
        where: { id },
        data: { bestPlayerId: input.bestPlayerId, attendance: input.attendance },
      });
    }
    const report = await this.prisma.matchReport.upsert({
      where: { matchId: id },
      create: {
        matchId: id,
        status: "CLOSED",
        observations: input.observations,
        incidents: input.incidents,
        closedById: user.sub,
        closedAt: new Date(),
      },
      update: {
        status: "CLOSED",
        observations: input.observations,
        incidents: input.incidents,
        closedById: user.sub,
        closedAt: new Date(),
      },
    });

    await this.afterResult(id);
    return report;
  }

  // ─── Recálculo y progresión ────────────────────────────────────────────

  /** Marcador como proyección de los eventos (Fase 5 §3.3). */
  private async syncScore(matchId: string) {
    const match = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: { events: true },
    });
    const count = (teamId: string | null, types: readonly string[]) =>
      match.events.filter((e) => e.teamId === teamId && types.includes(e.type)).length;

    // Los penales existen (aunque sean 0) solo si hubo tanda.
    const hadShootout = match.events.some((e) => e.type.startsWith("SHOOTOUT_"));
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: count(match.homeTeamId, GOAL_TYPES),
        awayScore: count(match.awayTeamId, GOAL_TYPES),
        homePenalties: hadShootout ? count(match.homeTeamId, ["SHOOTOUT_GOAL"]) : null,
        awayPenalties: hadShootout ? count(match.awayTeamId, ["SHOOTOUT_GOAL"]) : null,
      },
    });
  }

  private async afterResult(matchId: string) {
    const match = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: { stage: true, tournament: true },
    });
    if (match.stage.type !== "KNOCKOUT") {
      await this.recalcStandings(match.stageId, match.groupId);
    }
    await this.propagateBracket(match);
    await this.resolveNextStageIfComplete(match);
  }

  /** Recalcula la tabla de la etapa/grupo con el motor de dominio. */
  private async recalcStandings(stageId: string, groupId: string | null) {
    const stage = await this.prisma.stage.findUniqueOrThrow({
      where: { id: stageId },
      include: { tournament: true },
    });
    const standingRows = await this.prisma.standing.findMany({
      where: { stageId, groupId },
    });
    const teamIds = standingRows.map((s) => s.teamId);

    const finished = await this.prisma.match.findMany({
      where: { stageId, groupId, status: { in: ["FINISHED", "WALKOVER"] } },
      include: { events: true },
    });

    // Fair play acumulado desde los eventos de tarjeta.
    const fairPlay: Record<string, number> = {};
    for (const m of finished) {
      for (const e of m.events) {
        const pts = FAIR_PLAY_POINTS[e.type];
        if (pts && e.teamId) fairPlay[e.teamId] = (fairPlay[e.teamId] ?? 0) + pts;
      }
    }

    const table = computeStandings(
      teamIds,
      finished
        .filter((m) => m.homeTeamId && m.awayTeamId && m.homeScore !== null)
        .map((m) => ({
          homeTeamId: m.homeTeamId!,
          awayTeamId: m.awayTeamId!,
          homeGoals: m.homeScore!,
          awayGoals: m.awayScore!,
        })),
      {
        pointsWin: stage.tournament.pointsWin,
        pointsDraw: stage.tournament.pointsDraw,
        pointsLoss: stage.tournament.pointsLoss,
        tiebreakers: stage.tournament.tiebreakers as Tiebreaker[],
        fairPlayPoints: fairPlay,
      },
    );

    for (const row of table) {
      // updateMany: el unique compuesto no admite groupId null (etapas sin grupos)
      await this.prisma.standing.updateMany({
        where: { stageId, groupId, teamId: row.teamId },
        data: {
          position: row.position,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDiff: row.goalDiff,
          points: row.points,
          fairPlayPoints: row.fairPlayPoints,
          form: row.form,
        },
      });
    }
  }

  /** Rellena las llaves que dependen de este partido (WINNER/LOSER). */
  private async propagateBracket(match: {
    id: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenalties: number | null;
    awayPenalties: number | null;
  }) {
    const winner = this.winnerOf(match);
    if (!winner) return;
    const loser = winner === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    const dependents = await this.prisma.match.findMany({
      where: { OR: [{ homeSourceMatchId: match.id }, { awaySourceMatchId: match.id }] },
    });
    for (const dep of dependents) {
      const data: Prisma.MatchUpdateInput = {};
      if (dep.homeSourceMatchId === match.id) {
        data.homeTeam = { connect: { id: dep.homeSourceTake === "WINNER" ? winner : loser! } };
      }
      if (dep.awaySourceMatchId === match.id) {
        data.awayTeam = { connect: { id: dep.awaySourceTake === "WINNER" ? winner : loser! } };
      }
      await this.prisma.match.update({ where: { id: dep.id }, data });
    }
  }

  /**
   * Si la etapa (RR/GRUPOS) quedó completa, siembra la primera ronda de
   * la etapa siguiente: 1º-4º/2º-3º en playoffs, cruce mundialista en
   * grupos (A1-B2/B1-A2).
   */
  private async resolveNextStageIfComplete(match: { stageId: string; tournamentId: string }) {
    const stage = await this.prisma.stage.findUniqueOrThrow({
      where: { id: match.stageId },
      include: { groups: { orderBy: { order: "asc" } } },
    });
    if (stage.type === "KNOCKOUT") return;

    const pending = await this.prisma.match.count({
      where: {
        stageId: stage.id,
        status: { notIn: ["FINISHED", "WALKOVER", "CANCELLED"] },
      },
    });
    if (pending > 0) return;

    const nextStage = await this.prisma.stage.findFirst({
      where: { tournamentId: match.tournamentId, order: stage.order + 1, type: "KNOCKOUT" },
      include: { rounds: { orderBy: { number: "asc" } } },
    });
    if (!nextStage) return;

    const firstRound = nextStage.rounds[0];
    if (!firstRound) return;
    const slots = await this.prisma.match.findMany({
      where: { roundId: firstRound.id, homeTeamId: null, homeSourceMatchId: null },
      orderBy: { bracketSlot: "asc" },
    });
    if (slots.length === 0) return; // ya sembrada

    let pairs: [string, string][];
    if (stage.type === "GROUPS" && stage.groups.length > 1) {
      const qualified = (nextStage.qualifyRules as { qualifiedPerGroup?: number | null })
        ?.qualifiedPerGroup;
      const perGroup =
        qualified ??
        (stage.qualifyRules as { qualifiedPerGroup?: number | null })?.qualifiedPerGroup ??
        2;
      const byGroup: string[][] = [];
      for (const g of stage.groups) {
        const rows = await this.prisma.standing.findMany({
          where: { stageId: stage.id, groupId: g.id },
          orderBy: { position: "asc" },
          take: perGroup,
        });
        byGroup.push(rows.map((r) => r.teamId));
      }
      pairs = crossGroupQualifiers(byGroup, perGroup);
    } else {
      // Liga → playoffs: top N por sembrado clásico (1-4, 2-3…).
      const entrants = slots.length * 2;
      const rows = await this.prisma.standing.findMany({
        where: { stageId: stage.id },
        orderBy: { position: "asc" },
        take: entrants,
      });
      const order = seedOrder(entrants);
      pairs = [];
      for (let i = 0; i < order.length; i += 2) {
        pairs.push([rows[order[i]! - 1]!.teamId, rows[order[i + 1]! - 1]!.teamId]);
      }
    }

    for (const [i, slot] of slots.entries()) {
      const pair = pairs[i];
      if (!pair) break;
      await this.prisma.match.update({
        where: { id: slot.id },
        data: { homeTeamId: pair[0], awayTeamId: pair[1] },
      });
    }
  }

  private winnerOf(m: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homePenalties: number | null;
    awayPenalties: number | null;
  }): string | null {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null) {
      return null;
    }
    if (m.homeScore !== m.awayScore) {
      return m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
    }
    if (m.homePenalties !== null && m.awayPenalties !== null) {
      return m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId;
    }
    return null; // empate sin penales: válido en liga, no propaga llave
  }

  // ─── Permisos y helpers ────────────────────────────────────────────────

  /** ADMIN de la org, o árbitro designado (por su perfil enlazado). */
  private async assertCanOperate(orgId: string, matchId: string, user: AccessTokenPayload) {
    const roles = user.orgs[orgId] ?? [];
    if (user.globalRole === "SUPER_ADMIN" || roles.includes("LEAGUE_ADMIN")) return;

    const official = await this.prisma.matchOfficial.findFirst({
      where: { matchId, referee: { userId: user.sub }, status: { not: "DECLINED" } },
    });
    if (!official) {
      throw new ForbiddenException("Solo el árbitro designado puede operar este partido");
    }
  }

  private async getOwned(orgId: string, id: string) {
    const match = await this.prisma.match.findFirst({
      where: { id, organizationId: orgId },
      include: { report: true },
    });
    if (!match) throw new NotFoundException("Partido no encontrado");
    return match;
  }
}
