/**
 * Motor de clasificación: calcula la tabla desde los resultados con
 * criterios de desempate configurables por torneo.
 */

export type Tiebreaker = "POINTS" | "GD" | "GF" | "H2H" | "FAIR_PLAY" | "DRAW";

export interface PlayedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingsConfig {
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  tiebreakers?: Tiebreaker[];
  /** Puntos fair play acumulados por equipo (menor = mejor). */
  fairPlayPoints?: Record<string, number>;
}

export interface StandingRow {
  teamId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  fairPlayPoints: number;
  /** Últimos 5 resultados, más reciente al final: "WWDLW". */
  form: string;
  /** true si el orden final dependió del criterio DRAW (sorteo). */
  tiedByLot: boolean;
}

const DEFAULT_TIEBREAKERS: Tiebreaker[] = ["POINTS", "GD", "GF", "H2H", "FAIR_PLAY", "DRAW"];

interface Acc {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  results: ("W" | "D" | "L")[];
}

function accumulate(
  teamIds: readonly string[],
  matches: readonly PlayedMatch[],
  pw: number,
  pd: number,
  pl: number,
): Map<string, Acc> {
  const table = new Map<string, Acc>();
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      results: [],
    });
  }

  for (const m of matches) {
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) continue; // partido de otro grupo/etapa

    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.won++;
      home.points += pw;
      home.results.push("W");
      away.lost++;
      away.points += pl;
      away.results.push("L");
    } else if (m.homeGoals < m.awayGoals) {
      away.won++;
      away.points += pw;
      away.results.push("W");
      home.lost++;
      home.points += pl;
      home.results.push("L");
    } else {
      home.drawn++;
      away.drawn++;
      home.points += pd;
      away.points += pd;
      home.results.push("D");
      away.results.push("D");
    }
  }
  return table;
}

/** Compara dos equipos con un criterio; <0 ⇒ a primero. */
function compareBy(
  criterion: Tiebreaker,
  a: Acc,
  b: Acc,
  ctx: {
    fairPlay: Record<string, number>;
    h2h: Map<string, Map<string, Acc>> | null;
  },
): number {
  switch (criterion) {
    case "POINTS":
      return b.points - a.points;
    case "GD":
      return b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst);
    case "GF":
      return b.goalsFor - a.goalsFor;
    case "FAIR_PLAY":
      return (ctx.fairPlay[a.teamId] ?? 0) - (ctx.fairPlay[b.teamId] ?? 0); // menor gana
    case "H2H": {
      // Mini-tabla solo con los enfrentamientos del grupo empatado.
      const table = ctx.h2h;
      if (!table) return 0;
      const ra = table.get(a.teamId)?.get(a.teamId);
      const rb = table.get(b.teamId)?.get(b.teamId);
      if (!ra || !rb) return 0;
      if (rb.points !== ra.points) return rb.points - ra.points;
      const gdA = ra.goalsFor - ra.goalsAgainst;
      const gdB = rb.goalsFor - rb.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return rb.goalsFor - ra.goalsFor;
    }
    case "DRAW":
      // Determinista y auditable a falta de sorteo manual: orden por id.
      return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  }
}

export function computeStandings(
  teamIds: readonly string[],
  matches: readonly PlayedMatch[],
  config: StandingsConfig = {},
): StandingRow[] {
  const pw = config.pointsWin ?? 3;
  const pd = config.pointsDraw ?? 1;
  const pl = config.pointsLoss ?? 0;
  const tiebreakers = config.tiebreakers ?? DEFAULT_TIEBREAKERS;
  const fairPlay = config.fairPlayPoints ?? {};

  const table = accumulate(teamIds, matches, pw, pd, pl);
  const rows = [...table.values()];

  // Precalcular H2H por grupos de empate en puntos (criterio más común).
  const h2hCache = new Map<string, Map<string, Acc>>();
  const byPoints = new Map<number, Acc[]>();
  for (const row of rows) {
    const bucket = byPoints.get(row.points) ?? [];
    bucket.push(row);
    byPoints.set(row.points, bucket);
  }
  for (const bucket of byPoints.values()) {
    if (bucket.length < 2) continue;
    const ids = new Set(bucket.map((r) => r.teamId));
    const h2hMatches = matches.filter((m) => ids.has(m.homeTeamId) && ids.has(m.awayTeamId));
    const mini = accumulate([...ids], h2hMatches, pw, pd, pl);
    for (const id of ids) {
      const inner = new Map<string, Acc>();
      inner.set(id, mini.get(id)!);
      h2hCache.set(id, inner);
    }
  }

  const usedLot = new Set<string>();
  const sorted = rows.sort((a, b) => {
    for (const criterion of tiebreakers) {
      const cmp = compareBy(criterion, a, b, { fairPlay, h2h: h2hCache });
      if (cmp !== 0) {
        if (criterion === "DRAW") {
          usedLot.add(a.teamId);
          usedLot.add(b.teamId);
        }
        return cmp;
      }
    }
    return 0;
  });

  return sorted.map((r, i) => ({
    teamId: r.teamId,
    position: i + 1,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDiff: r.goalsFor - r.goalsAgainst,
    points: r.points,
    fairPlayPoints: fairPlay[r.teamId] ?? 0,
    form: r.results.slice(-5).join(""),
    tiedByLot: usedLot.has(r.teamId),
  }));
}
