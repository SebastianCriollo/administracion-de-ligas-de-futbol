import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth, createApp, prisma, registerAdmin, resetDatabase, type Session } from "./helpers";

let app: INestApplication;
let s: Session;
let seasonId: string;
let teamIds: string[];

async function post(path: string, body?: object, expected = 201) {
  const res = await s.agent
    .post(`/api/v1/orgs/${s.orgId}${path}`)
    .set(auth(s.token))
    .send(body ?? {});
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(expected);
  return res.body;
}
async function get(path: string) {
  const res = await s.agent.get(`/api/v1/orgs/${s.orgId}${path}`).set(auth(s.token)).expect(200);
  return res.body;
}

beforeAll(async () => {
  await resetDatabase();
  app = await createApp();
  s = await registerAdmin(app);

  const league = await post("/leagues", { name: "Liga Test" });
  const season = await post(`/leagues/${league.id}/seasons`, { name: "T-2026", year: 2026 });
  seasonId = season.id;

  teamIds = [];
  for (let i = 1; i <= 4; i++) {
    const t = await post("/teams", { name: `Equipo ${i}` });
    teamIds.push(t.id);
  }
}, 60_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("Wizard de torneo", () => {
  it("preview genera fixture sin persistir", async () => {
    const preview = await post(
      "/tournaments/preview",
      { seasonId, name: "Preview Cup", format: "LEAGUE", teamIds },
      201,
    );
    expect(preview.stages).toHaveLength(1);
    expect(preview.stages[0].rounds).toHaveLength(3); // 4 equipos → 3 jornadas
    expect(await prisma.tournament.count()).toBe(0);
  });

  it("rechaza torneos con equipos de otra organización", async () => {
    const otherOrg = await prisma.organization.create({
      data: { name: "Otra Org", slug: `otra-org-${Date.now()}` },
    });
    const intruso = await prisma.team.create({
      data: { organizationId: otherOrg.id, name: "Intruso", slug: "intruso" },
    });
    await post(
      "/tournaments/preview",
      { seasonId, name: "Hack", format: "LEAGUE", teamIds: [teamIds[0], intruso.id] },
      400,
    );
  });

  it("publica LEAGUE_PLAYOFFS: fase regular + llave con vínculos y standings", async () => {
    const t = await post("/tournaments", {
      seasonId,
      name: "Torneo Principal",
      format: "LEAGUE_PLAYOFFS",
      modality: "FUTBOL_7",
      teamIds,
    });
    const published = await post(`/tournaments/${t.id}/publish`, {}, 201);

    expect(published.status).toBe("PUBLISHED");
    expect(published.stages).toHaveLength(2);
    const [regular, playoffs] = published.stages;
    // 4 equipos RR → 3 jornadas × 2 partidos
    expect(regular.rounds.flatMap((r: { matches: unknown[] }) => r.matches)).toHaveLength(6);
    // playoffs de 4: semis (2) + final (1), sin equipos aún
    const koMatches = playoffs.rounds.flatMap((r: { matches: { homeTeamId: null }[] }) => r.matches);
    expect(koMatches).toHaveLength(3);
    expect(koMatches.every((m: { homeTeamId: string | null }) => m.homeTeamId === null)).toBe(true);

    const standings = await get(`/tournaments/${t.id}/standings`);
    expect(standings).toHaveLength(4);
    expect(standings.every((row: { points: number }) => row.points === 0)).toBe(true);
  });

  it("no se puede publicar dos veces ni eliminar publicado", async () => {
    const t = (await get("/tournaments")).find(
      (x: { name: string }) => x.name === "Torneo Principal",
    );
    await post(`/tournaments/${t.id}/publish`, {}, 409);
    await s.agent
      .delete(`/api/v1/orgs/${s.orgId}/tournaments/${t.id}`)
      .set(auth(s.token))
      .expect(409);
  });
});

describe("Ciclo de partido → tabla → progresión", () => {
  async function playMatch(m: { id: string; homeTeamId: string; awayTeamId: string }, homeGoals: number, awayGoals: number) {
    await post(`/matches/${m.id}/transitions`, { action: "START" }, 201);
    for (let i = 0; i < homeGoals; i++) {
      await post(`/matches/${m.id}/events`, { type: "GOAL", minute: 10 + i, teamId: m.homeTeamId }, 201);
    }
    for (let i = 0; i < awayGoals; i++) {
      await post(`/matches/${m.id}/events`, { type: "GOAL", minute: 40 + i, teamId: m.awayTeamId }, 201);
    }
    await post(`/matches/${m.id}/transitions`, { action: "FINISH" }, 201);
    await post(`/matches/${m.id}/report/close`, { observations: "test" }, 201);
  }

  it("juega la fase regular completa y siembra las semifinales 1-4/2-3", async () => {
    const t = (await get("/tournaments")).find(
      (x: { name: string }) => x.name === "Torneo Principal",
    );
    const all = await get(`/matches?tournamentId=${t.id}`);
    const regular = all.filter((m: { homeTeam: unknown }) => m.homeTeam);
    expect(regular).toHaveLength(6);

    // resultados deterministas: Equipo 1 gana todo, 2 gana 2, 3 gana 1
    const strength = new Map(teamIds.map((id, i) => [id, 4 - i]));
    for (const m of regular) {
      const home = strength.get(m.homeTeam.id)!;
      const away = strength.get(m.awayTeam.id)!;
      await playMatch(
        { id: m.id, homeTeamId: m.homeTeam.id, awayTeamId: m.awayTeam.id },
        home > away ? 2 : 0,
        home > away ? 0 : 2,
      );
    }

    const standings = (await get(`/tournaments/${t.id}/standings`)).filter(
      (row: { stage: { order: number } }) => row.stage.order === 1,
    );
    expect(standings[0].team.name).toBe("Equipo 1");
    expect(standings[0].points).toBe(9);
    expect(standings[3].team.name).toBe("Equipo 4");
    expect(standings[3].points).toBe(0);
    expect(standings[0].form).toBe("WWW");

    // semifinales sembradas: 1º vs 4º y 2º vs 3º
    const after = await get(`/matches?tournamentId=${t.id}`);
    const semis = after.filter(
      (m: { round: { name: string } | null }) => m.round?.name === "Semifinales",
    );
    expect(semis).toHaveLength(2);
    const names = semis.map(
      (m: { homeTeam: { name: string }; awayTeam: { name: string } }) =>
        `${m.homeTeam.name} vs ${m.awayTeam.name}`,
    );
    expect(names).toContain("Equipo 1 vs Equipo 4");
    expect(names).toContain("Equipo 2 vs Equipo 3");
  });

  it("los ganadores de semis se propagan a la final; empate resuelve por penales", async () => {
    const t = (await get("/tournaments")).find(
      (x: { name: string }) => x.name === "Torneo Principal",
    );
    const all = await get(`/matches?tournamentId=${t.id}`);
    const semis = all.filter(
      (m: { round: { name: string } | null }) => m.round?.name === "Semifinales",
    );

    // SF1: gana el local 1-0 · SF2: 1-1 y penales para el local
    await playMatch(
      { id: semis[0].id, homeTeamId: semis[0].homeTeam.id, awayTeamId: semis[0].awayTeam.id },
      1,
      0,
    );
    const sf2 = semis[1];
    await post(`/matches/${sf2.id}/transitions`, { action: "START" }, 201);
    await post(`/matches/${sf2.id}/events`, { type: "GOAL", minute: 5, teamId: sf2.homeTeam.id }, 201);
    await post(`/matches/${sf2.id}/events`, { type: "GOAL", minute: 80, teamId: sf2.awayTeam.id }, 201);
    await post(`/matches/${sf2.id}/transitions`, { action: "START_PENALTIES" }, 201);
    await post(`/matches/${sf2.id}/events`, { type: "SHOOTOUT_GOAL", teamId: sf2.homeTeam.id }, 201);
    await post(`/matches/${sf2.id}/events`, { type: "SHOOTOUT_MISS", teamId: sf2.awayTeam.id }, 201);
    await post(`/matches/${sf2.id}/transitions`, { action: "FINISH" }, 201);
    await post(`/matches/${sf2.id}/report/close`, {}, 201);

    const after = await get(`/matches?tournamentId=${t.id}`);
    const final = after.find((m: { round: { name: string } | null }) => m.round?.name === "Final");
    expect(final.homeTeam.name).toBe(semis[0].homeTeam.name);
    expect(final.awayTeam.name).toBe(sf2.homeTeam.name); // ganó por penales
  });

  it("acta cerrada rechaza eventos y transiciones inválidas responden 409", async () => {
    const t = (await get("/tournaments")).find(
      (x: { name: string }) => x.name === "Torneo Principal",
    );
    const all = await get(`/matches?tournamentId=${t.id}`);
    const closed = all.find((m: { status: string }) => m.status === "FINISHED");
    await post(`/matches/${closed.id}/events`, { type: "GOAL", teamId: closed.homeTeam.id }, 409);
    await post(`/matches/${closed.id}/transitions`, { action: "START" }, 409);
  });

  it("reporte de tabla en los tres formatos con firma correcta", async () => {
    const t = (await get("/tournaments")).find(
      (x: { name: string }) => x.name === "Torneo Principal",
    );
    for (const [format, magic] of [
      ["csv", "﻿#"],
      ["pdf", "%PDF"],
    ] as const) {
      const res = await s.agent
        .get(`/api/v1/orgs/${s.orgId}/reports/standings?tournamentId=${t.id}&format=${format}`)
        .set(auth(s.token))
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on("data", (c: Buffer) => chunks.push(c));
          r.on("end", () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect((res.body as Buffer).toString("utf8", 0, 8)).toContain(magic);
    }
    const xlsx = await s.agent
      .get(`/api/v1/orgs/${s.orgId}/reports/standings?tournamentId=${t.id}&format=xlsx`)
      .set(auth(s.token))
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe("PK"); // zip
  });
});
