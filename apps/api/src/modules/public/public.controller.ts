import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { Public } from "../../auth/decorators";
import { PrismaService } from "../../infrastructure/prisma.service";

const TEAM_SELECT = { select: { id: true, name: true, shortName: true, crestUrl: true } } as const;

/**
 * Portal público (Fase 6 §3): sin autenticación, solo datos publicados,
 * pensado para ISR — el frontend cachea estas respuestas por slug.
 */
@Public()
@Controller("public/:orgSlug")
export class PublicController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Resumen del portal: hoy, torneos activos, últimas noticias. */
  @Get()
  async home(@Param("orgSlug") orgSlug: string) {
    const org = await this.org(orgSlug);
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [tournaments, todayMatches, news] = await Promise.all([
      this.prisma.tournament.findMany({
        where: { organizationId: org.id, status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] } },
        select: { id: true, name: true, slug: true, format: true, modality: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      this.prisma.match.findMany({
        where: {
          organizationId: org.id,
          scheduledAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) },
        },
        include: {
          homeTeam: TEAM_SELECT,
          awayTeam: TEAM_SELECT,
          tournament: { select: { name: true, slug: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      this.prisma.news.findMany({
        where: { organizationId: org.id, status: "PUBLISHED" },
        select: { title: true, slug: true, excerpt: true, coverUrl: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 6,
      }),
    ]);

    return { organization: org, tournaments, todayMatches, news };
  }

  /** Detalle público de torneo: tabla(s), fixture y llaves. */
  @Get("tournaments/:slug")
  async tournament(@Param("orgSlug") orgSlug: string, @Param("slug") slug: string) {
    const org = await this.org(orgSlug);
    const t = await this.prisma.tournament.findFirst({
      where: {
        organizationId: org.id,
        slug,
        status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] },
      },
      include: {
        season: { select: { name: true, year: true, league: { select: { name: true } } } },
        stages: {
          orderBy: { order: "asc" },
          include: {
            groups: { orderBy: { order: "asc" } },
            rounds: {
              orderBy: { number: "asc" },
              include: {
                matches: {
                  include: { homeTeam: TEAM_SELECT, awayTeam: TEAM_SELECT, venue: { select: { name: true } } },
                  orderBy: { bracketSlot: "asc" },
                },
              },
            },
          },
        },
        standings: {
          include: { team: TEAM_SELECT, group: { select: { id: true, name: true } }, stage: { select: { order: true } } },
          orderBy: [{ stage: { order: "asc" } }, { position: "asc" }],
        },
      },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    return { organization: org, tournament: t };
  }

  /** Goleadores públicos del torneo. */
  @Get("tournaments/:slug/scorers")
  async scorers(@Param("orgSlug") orgSlug: string, @Param("slug") slug: string) {
    const org = await this.org(orgSlug);
    const t = await this.prisma.tournament.findFirst({
      where: { organizationId: org.id, slug },
      select: { id: true },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    const grouped = await this.prisma.matchEvent.groupBy({
      by: ["playerId", "teamId"],
      where: { type: { in: ["GOAL", "PENALTY_GOAL"] }, playerId: { not: null }, match: { tournamentId: t.id } },
      _count: { _all: true },
      orderBy: { _count: { playerId: "desc" } },
      take: 15,
    });
    const players = new Map(
      (
        await this.prisma.player.findMany({
          where: { id: { in: grouped.map((g) => g.playerId!) } },
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        })
      ).map((p) => [p.id, p]),
    );
    const teams = new Map(
      (
        await this.prisma.team.findMany({
          where: { id: { in: grouped.map((g) => g.teamId!).filter(Boolean) } },
          select: { id: true, name: true },
        })
      ).map((t2) => [t2.id, t2]),
    );
    return grouped.map((g) => ({
      goals: g._count._all,
      player: players.get(g.playerId!) ?? null,
      team: g.teamId ? (teams.get(g.teamId) ?? null) : null,
    }));
  }

  @Get("news")
  async news(@Param("orgSlug") orgSlug: string) {
    const org = await this.org(orgSlug);
    return this.prisma.news.findMany({
      where: { organizationId: org.id, status: "PUBLISHED" },
      select: { title: true, slug: true, excerpt: true, coverUrl: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 30,
    });
  }

  @Get("news/:slug")
  async article(@Param("orgSlug") orgSlug: string, @Param("slug") slug: string) {
    const org = await this.org(orgSlug);
    const article = await this.prisma.news.findFirst({
      where: { organizationId: org.id, slug, status: "PUBLISHED" },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    if (!article) throw new NotFoundException("Noticia no encontrada");
    return { organization: org, article };
  }

  private async org(slug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, city: true, country: true },
    });
    if (!org) throw new NotFoundException("Organización no encontrada");
    return org;
  }
}
