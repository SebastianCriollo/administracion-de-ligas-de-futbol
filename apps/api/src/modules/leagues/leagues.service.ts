import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import type {
  createLeagueSchema,
  createSeasonSchema,
  duplicateSeasonSchema,
  updateLeagueSchema,
} from "@ligas/contracts";
import { PrismaService } from "../../infrastructure/prisma.service";
import { slugify } from "../../common/slugify";

@Injectable()
export class LeaguesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.league.findMany({
      where: { organizationId: orgId },
      include: { seasons: { orderBy: { year: "desc" } }, _count: { select: { seasons: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(orgId: string, id: string) {
    const league = await this.prisma.league.findFirst({
      where: { id, organizationId: orgId },
      include: {
        seasons: { orderBy: { year: "desc" }, include: { tournaments: true } },
      },
    });
    if (!league) throw new NotFoundException("Liga no encontrada");
    return league;
  }

  create(orgId: string, input: z.infer<typeof createLeagueSchema>) {
    return this.prisma.league.create({
      data: {
        organizationId: orgId,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description,
      },
    });
  }

  async update(orgId: string, id: string, input: z.infer<typeof updateLeagueSchema>) {
    await this.get(orgId, id);
    return this.prisma.league.update({ where: { id }, data: input });
  }

  async remove(orgId: string, id: string) {
    await this.get(orgId, id);
    await this.prisma.league.delete({ where: { id } });
    return { id };
  }

  async createSeason(orgId: string, leagueId: string, input: z.infer<typeof createSeasonSchema>) {
    await this.get(orgId, leagueId);
    return this.prisma.season.create({ data: { leagueId, ...input } });
  }

  /** Duplica temporada: misma estructura, estadísticas en cero (Fase 1 §7). */
  async duplicateSeason(
    orgId: string,
    leagueId: string,
    input: z.infer<typeof duplicateSeasonSchema>,
  ) {
    await this.get(orgId, leagueId);
    const source = await this.prisma.season.findFirst({
      where: { id: input.sourceSeasonId, leagueId },
      include: { rosters: true },
    });
    if (!source) throw new NotFoundException("Temporada origen no encontrada");

    return this.prisma.$transaction(async (tx) => {
      const season = await tx.season.create({
        data: { leagueId, name: input.name, year: input.year },
      });
      if (input.copyRosters) {
        // Copia las fichas vigentes; el historial de la vieja queda intacto.
        const active = source.rosters.filter((r) => r.leftAt === null);
        for (const r of active) {
          await tx.teamPlayer.create({
            data: {
              teamId: r.teamId,
              playerId: r.playerId,
              seasonId: season.id,
              shirtNumber: r.shirtNumber,
              isCaptain: r.isCaptain,
            },
          });
        }
      }
      return season;
    });
  }
}
