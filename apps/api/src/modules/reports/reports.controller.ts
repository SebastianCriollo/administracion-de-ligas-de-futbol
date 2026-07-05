import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { Roles } from "../../auth/decorators";
import { PrismaService } from "../../infrastructure/prisma.service";
import { renderPdf, toCsv, toPdf, toXlsx, type Table } from "./exporters";

const MIME = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;
type Format = keyof typeof MIME;

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/reports")
export class ReportsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("standings")
  async standings(
    @Param("orgId") orgId: string,
    @Query("tournamentId") tournamentId: string,
    @Query("format") format: string,
    @Res() res: Response,
  ) {
    const t = await this.tournament(orgId, tournamentId);
    const rows = await this.prisma.standing.findMany({
      where: { tournamentId },
      include: { team: true, group: true, stage: true },
      orderBy: [{ stage: { order: "asc" } }, { position: "asc" }],
    });
    await this.reply(res, this.format(format), `tabla-${t.slug}`, {
      title: `Tabla de posiciones — ${t.name}`,
      subtitle: this.subtitle(t),
      headers: ["#", "Equipo", "Grupo", "PJ", "PG", "PE", "PP", "GF", "GC", "DG", "PTS", "FP"],
      numeric: [3, 4, 5, 6, 7, 8, 9, 10, 11],
      rows: rows.map((s) => [
        s.position,
        s.team.name,
        s.group?.name ?? "—",
        s.played,
        s.won,
        s.drawn,
        s.lost,
        s.goalsFor,
        s.goalsAgainst,
        s.goalDiff,
        s.points,
        s.fairPlayPoints,
      ]),
    });
  }

  @Get("schedule")
  async schedule(
    @Param("orgId") orgId: string,
    @Query("tournamentId") tournamentId: string,
    @Query("format") format: string,
    @Res() res: Response,
  ) {
    const t = await this.tournament(orgId, tournamentId);
    const matches = await this.prisma.match.findMany({
      where: { tournamentId },
      include: { homeTeam: true, awayTeam: true, round: true, venue: true, stage: true },
      orderBy: [{ stage: { order: "asc" } }, { round: { number: "asc" } }],
    });
    await this.reply(res, this.format(format), `calendario-${t.slug}`, {
      title: `Calendario y resultados — ${t.name}`,
      subtitle: this.subtitle(t),
      headers: ["Etapa", "Ronda", "Local", "Marcador", "Visitante", "Estado", "Fecha", "Escenario"],
      rows: matches.map((m) => [
        m.stage.name,
        m.round?.name ?? "—",
        m.homeTeam?.name ?? "Por definir",
        m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : "",
        m.awayTeam?.name ?? "Por definir",
        m.status,
        m.scheduledAt?.toISOString().slice(0, 16).replace("T", " ") ?? "",
        m.venue?.name ?? "",
      ]),
    });
  }

  @Get("scorers")
  async scorers(
    @Param("orgId") orgId: string,
    @Query("tournamentId") tournamentId: string,
    @Query("format") format: string,
    @Res() res: Response,
  ) {
    const t = await this.tournament(orgId, tournamentId);
    const grouped = await this.prisma.matchEvent.groupBy({
      by: ["playerId", "teamId"],
      where: {
        type: { in: ["GOAL", "PENALTY_GOAL"] },
        playerId: { not: null },
        match: { tournamentId },
      },
      _count: { _all: true },
      orderBy: { _count: { playerId: "desc" } },
      take: 50,
    });
    const players = new Map(
      (
        await this.prisma.player.findMany({
          where: { id: { in: grouped.map((g) => g.playerId!) } },
        })
      ).map((p) => [p.id, p]),
    );
    const teams = new Map(
      (
        await this.prisma.team.findMany({
          where: { id: { in: grouped.map((g) => g.teamId!).filter(Boolean) } },
        })
      ).map((x) => [x.id, x]),
    );
    await this.reply(res, this.format(format), `goleadores-${t.slug}`, {
      title: `Máximos goleadores — ${t.name}`,
      subtitle: this.subtitle(t),
      headers: ["#", "Jugador", "Equipo", "Goles"],
      numeric: [3],
      rows: grouped.map((g, i) => {
        const p = players.get(g.playerId!);
        return [
          i + 1,
          p ? `${p.firstName} ${p.lastName}` : "—",
          g.teamId ? (teams.get(g.teamId)?.name ?? "—") : "—",
          g._count._all,
        ];
      }),
    });
  }

  /** Acta oficial del partido en PDF. */
  @Get("match/:matchId/acta")
  async matchReport(
    @Param("orgId") orgId: string,
    @Param("matchId") matchId: string,
    @Res() res: Response,
  ) {
    const m = await this.prisma.match.findFirst({
      where: { id: matchId, organizationId: orgId },
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: { include: { season: { include: { league: true } } } },
        round: true,
        stage: true,
        venue: true,
        events: {
          orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
          include: { player: true, team: true },
        },
        officials: { include: { referee: true } },
        report: { include: { closedBy: true } },
      },
    });
    if (!m) throw new NotFoundException("Partido no encontrado");

    const EVENT_LABEL: Record<string, string> = {
      GOAL: "GOL",
      PENALTY_GOAL: "GOL (penal)",
      OWN_GOAL: "AUTOGOL",
      YELLOW_CARD: "T. AMARILLA",
      SECOND_YELLOW: "2ª AMARILLA",
      RED_CARD: "T. ROJA",
      SUBSTITUTION: "CAMBIO",
      INJURY: "LESIÓN",
      INCIDENT: "INCIDENCIA",
      SHOOTOUT_GOAL: "PENAL ANOTADO",
      SHOOTOUT_MISS: "PENAL FALLADO",
    };

    const buffer = await renderPdf((doc) => {
      doc.fontSize(9).fillColor("#666").text(m.tournament.season.league.organizationId ? "" : "");
      doc
        .fontSize(16)
        .fillColor("#111")
        .font("Helvetica-Bold")
        .text("ACTA OFICIAL DE PARTIDO", { align: "center" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#444")
        .text(
          `${m.tournament.name} · ${m.stage.name}${m.round?.name ? ` · ${m.round.name}` : ""}`,
          { align: "center" },
        );
      doc.moveDown(1.5);

      // Marcador
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111");
      const score =
        m.homeScore !== null
          ? `${m.homeScore} - ${m.awayScore}` +
            (m.homePenalties !== null ? `  (pen. ${m.homePenalties}-${m.awayPenalties})` : "")
          : "vs";
      doc.text(`${m.homeTeam?.name ?? "Por definir"}   ${score}   ${m.awayTeam?.name ?? "Por definir"}`, {
        align: "center",
      });
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#444")
        .text(
          [
            m.scheduledAt ? `Fecha: ${m.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}` : null,
            m.venue ? `Escenario: ${m.venue.name}` : null,
            `Estado: ${m.status}`,
          ]
            .filter(Boolean)
            .join("   ·   "),
          { align: "center" },
        );
      doc.moveDown(1.5);

      // Eventos
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111").text("Eventos del partido");
      doc.moveDown(0.4);
      if (m.events.length === 0) {
        doc.fontSize(9).font("Helvetica").fillColor("#666").text("Sin eventos registrados.");
      }
      for (const e of m.events) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#111")
          .text(
            `${e.minute !== null ? `${e.minute}'`.padStart(4) : "  — "}  ${EVENT_LABEL[e.type] ?? e.type}` +
              `${e.player ? ` — ${e.player.firstName} ${e.player.lastName}` : ""}` +
              `${e.team ? ` (${e.team.name})` : ""}` +
              `${e.note ? ` · ${e.note}` : ""}`,
          );
      }
      doc.moveDown(1);

      // Cuerpo arbitral
      if (m.officials.length > 0) {
        doc.fontSize(11).font("Helvetica-Bold").text("Cuerpo arbitral");
        doc.moveDown(0.4);
        for (const o of m.officials) {
          doc
            .fontSize(9)
            .font("Helvetica")
            .text(`${o.role}: ${o.referee.firstName} ${o.referee.lastName} (${o.status})`);
        }
        doc.moveDown(1);
      }

      // Observaciones
      if (m.report?.observations || m.report?.incidents) {
        doc.fontSize(11).font("Helvetica-Bold").text("Observaciones e incidencias");
        doc.moveDown(0.4);
        if (m.report.observations) doc.fontSize(9).font("Helvetica").text(m.report.observations);
        if (m.report.incidents) doc.fontSize(9).font("Helvetica").text(`Incidencias: ${m.report.incidents}`);
        doc.moveDown(1);
      }

      // Pie de firma
      doc.moveDown(2);
      doc.fontSize(9).fillColor("#444");
      const closed = m.report?.closedAt
        ? `Acta cerrada el ${m.report.closedAt.toISOString().slice(0, 16).replace("T", " ")}` +
          (m.report.closedBy ? ` por ${m.report.closedBy.firstName} ${m.report.closedBy.lastName}` : "")
        : "Acta sin cerrar";
      doc.text(closed);
      doc.moveDown(2);
      doc.text("_______________________            _______________________");
      doc.text("     Árbitro principal                        Veedor/Delegado");
    });

    res
      .set({
        "Content-Type": MIME.pdf,
        "Content-Disposition": `attachment; filename="acta-${m.id}.pdf"`,
      })
      .send(buffer);
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private format(format: string): Format {
    if (!["csv", "xlsx", "pdf"].includes(format)) {
      throw new BadRequestException("format debe ser csv, xlsx o pdf");
    }
    return format as Format;
  }

  private async tournament(orgId: string, id: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId },
      include: { season: { include: { league: true } } },
    });
    if (!t) throw new NotFoundException("Torneo no encontrado");
    return t;
  }

  private subtitle(t: { season: { name: string; league: { name: string } } }) {
    return `${t.season.league.name} · ${t.season.name} · generado ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  }

  private async reply(res: Response, format: Format, name: string, table: Table) {
    const buffer =
      format === "csv" ? toCsv(table) : format === "xlsx" ? await toXlsx(table) : await toPdf(table);
    res
      .set({
        "Content-Type": MIME[format],
        "Content-Disposition": `attachment; filename="${name}.${format}"`,
      })
      .send(buffer);
  }
}
