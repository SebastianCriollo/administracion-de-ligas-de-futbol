import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateTournamentInput, updateTournamentSchema } from "@ligas/contracts";
import type { Prisma } from "@ligas/database";
import type { z } from "zod";
import { slugify } from "../../common/slugify";
import { PrismaService } from "../../infrastructure/prisma.service";
import { FixtureService, type StagePreview } from "./fixture.service";

const PLACEHOLDER = /^__SLOT_\d+__$/;

@Injectable()
export class TournamentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FixtureService) private readonly fixture: FixtureService,
  ) {}

  list(orgId: string, filter: { status?: string; seasonId?: string } = {}) {
    return this.prisma.tournament.findMany({
      where: {
        organizationId: orgId,
        status: filter.status as never,
        seasonId: filter.seasonId,
      },
      include: {
        season: { select: { id: true, name: true, year: true, league: { select: { name: true } } } },
        _count: { select: { teams: true, matches: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(orgId: string, id: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId },
      include: {
        season: { include: { league: true } },
        teams: { include: { team: true, group: true } },
        stages: {
          orderBy: { order: "asc" },
          include: {
            groups: { orderBy: { order: "asc" } },
            rounds: {
              orderBy: { number: "asc" },
              include: {
                matches: {
                  include: {
                    homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
                    awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
                  },
                  orderBy: { bracketSlot: "asc" },
                },
              },
            },
          },
        },
      },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    return t;
  }

  /** Ejecuta el motor SIN persistir — paso 5 del wizard. */
  async preview(orgId: string, input: CreateTournamentInput) {
    await this.assertTeamsInOrg(orgId, input.teamIds);
    return { stages: this.fixture.build(input) };
  }

  async create(orgId: string, input: CreateTournamentInput) {
    await this.assertTeamsInOrg(orgId, input.teamIds);
    const season = await this.prisma.season.findFirst({
      where: { id: input.seasonId, league: { organizationId: orgId } },
    });
    if (!season) throw new NotFoundException("Temporada no encontrada");

    return this.prisma.tournament.create({
      data: {
        organizationId: orgId,
        seasonId: input.seasonId,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        format: input.format,
        modality: input.modality,
        startDate: input.startDate,
        pointsWin: input.pointsWin,
        pointsDraw: input.pointsDraw,
        pointsLoss: input.pointsLoss,
        tiebreakers: input.tiebreakers,
        rules: {
          stages: input.stages ?? null,
          scheduling: input.scheduling ?? null,
        } as Prisma.InputJsonValue,
        teams: {
          create: input.teamIds.map((teamId, i) => ({ teamId, seed: i + 1 })),
        },
      },
      include: { teams: true },
    });
  }

  async update(orgId: string, id: string, input: z.infer<typeof updateTournamentSchema>) {
    await this.getOwned(orgId, id);
    return this.prisma.tournament.update({ where: { id }, data: input });
  }

  async remove(orgId: string, id: string) {
    const t = await this.getOwned(orgId, id);
    if (t.status !== "DRAFT") {
      throw new ConflictException("Solo se puede eliminar un torneo en borrador");
    }
    await this.prisma.tournament.delete({ where: { id } });
    return { id };
  }

  /**
   * Publica: genera el fixture con el motor y lo persiste completo
   * (etapas, grupos, jornadas, partidos con vínculos de progresión y
   * tabla inicial). Transaccional: o se publica todo o nada.
   */
  async publish(orgId: string, id: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId },
      include: { teams: { orderBy: { seed: "asc" } } },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    if (t.status !== "DRAFT") throw new ConflictException("El torneo ya fue publicado");
    if (t.teams.length < 2) throw new BadRequestException("Se requieren al menos 2 equipos");

    const rules = t.rules as { stages?: CreateTournamentInput["stages"] };
    const teamIds = t.teams.map((tt) => tt.teamId);
    const previews = this.fixture.build({
      format: t.format,
      stages: rules.stages ?? undefined,
      teamIds,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const preview of previews) {
        await this.persistStage(tx, t.id, t.organizationId, preview);
      }
      await tx.tournament.update({
        where: { id: t.id },
        data: { status: "PUBLISHED" },
      });
    });

    return this.get(orgId, id);
  }

  async standings(orgId: string, id: string) {
    await this.getOwned(orgId, id);
    return this.prisma.standing.findMany({
      where: { tournamentId: id },
      include: {
        team: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        group: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, order: true } },
      },
      orderBy: [{ stage: { order: "asc" } }, { position: "asc" }],
    });
  }

  // ─── privados ──────────────────────────────────────────────────────────

  private async persistStage(
    tx: Prisma.TransactionClient,
    tournamentId: string,
    organizationId: string,
    { plan, rounds, groups, bracket }: StagePreview,
  ) {
    const stage = await tx.stage.create({
      data: {
        tournamentId,
        name: plan.name,
        type: plan.type,
        order: plan.order,
        legs: plan.legs,
        hasThirdPlace: plan.hasThirdPlace ?? false,
        qualifyRules: { qualifiedPerGroup: plan.qualifiedPerGroup ?? null },
      },
    });
    const base = { organizationId, tournamentId, stageId: stage.id };

    if (rounds) {
      for (const round of rounds) {
        const r = await tx.round.create({
          data: { stageId: stage.id, number: round.number, name: `Jornada ${round.number}` },
        });
        for (const p of round.pairings) {
          await tx.match.create({
            data: { ...base, roundId: r.id, homeTeamId: p.home, awayTeamId: p.away },
          });
        }
      }
      await this.initStandings(tx, base, rounds.flatMap((r) => r.pairings.flatMap((p) => [p.home, p.away])), null);
    }

    if (groups) {
      const maxRounds = Math.max(...groups.map((g) => g.rounds.length));
      const roundIds: string[] = [];
      for (let n = 1; n <= maxRounds; n++) {
        const r = await tx.round.create({
          data: { stageId: stage.id, number: n, name: `Jornada ${n}` },
        });
        roundIds.push(r.id);
      }
      for (const [gi, g] of groups.entries()) {
        const group = await tx.group.create({
          data: { stageId: stage.id, name: `Grupo ${g.name}`, order: gi + 1 },
        });
        await tx.tournamentTeam.updateMany({
          where: { tournamentId, teamId: { in: g.teamIds } },
          data: { groupId: group.id },
        });
        for (const round of g.rounds) {
          for (const p of round.pairings) {
            await tx.match.create({
              data: {
                ...base,
                groupId: group.id,
                roundId: roundIds[round.number - 1]!,
                homeTeamId: p.home,
                awayTeamId: p.away,
              },
            });
          }
        }
        await this.initStandings(tx, base, g.teamIds, group.id);
      }
    }

    if (bracket) {
      // Crea ronda por ronda resolviendo los ids de los partidos fuente.
      const idBySlot = new Map<string, string>();
      const teamOrNull = (v: string | null) => (v && !PLACEHOLDER.test(v) ? v : null);

      for (const [ri, roundMatches] of bracket.rounds.entries()) {
        const r = await tx.round.create({
          data: { stageId: stage.id, number: ri + 1, name: bracket.roundNames[ri] },
        });
        for (const m of roundMatches) {
          if (m.isBye) continue; // los byes no son partidos: ya propagados
          const created = await tx.match.create({
            data: {
              ...base,
              roundId: r.id,
              bracketSlot: m.slot,
              homeTeamId: teamOrNull(m.homeTeamId),
              awayTeamId: teamOrNull(m.awayTeamId),
              homeSourceMatchId: m.homeSource
                ? idBySlot.get(`${m.homeSource.round}:${m.homeSource.slot}`)
                : null,
              awaySourceMatchId: m.awaySource
                ? idBySlot.get(`${m.awaySource.round}:${m.awaySource.slot}`)
                : null,
              homeSourceTake: m.homeSource?.take ?? "WINNER",
              awaySourceTake: m.awaySource?.take ?? "WINNER",
            },
          });
          idBySlot.set(`${m.round}:${m.slot}`, created.id);
        }
      }

      if (bracket.thirdPlace) {
        const tp = bracket.thirdPlace;
        const finalRound = bracket.rounds.length;
        await tx.match.create({
          data: {
            ...base,
            roundId: (await tx.round.findFirstOrThrow({
              where: { stageId: stage.id, number: finalRound },
            })).id,
            bracketSlot: tp.slot,
            homeSourceMatchId: tp.homeSource
              ? idBySlot.get(`${tp.homeSource.round}:${tp.homeSource.slot}`)
              : null,
            awaySourceMatchId: tp.awaySource
              ? idBySlot.get(`${tp.awaySource.round}:${tp.awaySource.slot}`)
              : null,
            homeSourceTake: "LOSER",
            awaySourceTake: "LOSER",
          },
        });
      }
    }
  }

  private async initStandings(
    tx: Prisma.TransactionClient,
    base: { tournamentId: string; stageId: string },
    teamIds: string[],
    groupId: string | null,
  ) {
    const unique = [...new Set(teamIds)];
    for (const [i, teamId] of unique.entries()) {
      await tx.standing.create({
        data: {
          tournamentId: base.tournamentId,
          stageId: base.stageId,
          groupId,
          teamId,
          position: i + 1,
        },
      });
    }
  }

  private async getOwned(orgId: string, id: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    return t;
  }

  private async assertTeamsInOrg(orgId: string, teamIds: string[]) {
    const count = await this.prisma.team.count({
      where: { id: { in: teamIds }, organizationId: orgId },
    });
    if (count !== teamIds.length) {
      throw new BadRequestException("Hay equipos que no pertenecen a la organización");
    }
  }
}
