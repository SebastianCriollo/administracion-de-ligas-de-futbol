import { describe, expect, it } from "vitest";
import { computeStandings, type PlayedMatch } from "../src/standings";

const T = ["A", "B", "C", "D"];

describe("computeStandings", () => {
  it("acumula PJ/PG/PE/PP/GF/GC/DG/PTS correctamente", () => {
    const matches: PlayedMatch[] = [
      { homeTeamId: "A", awayTeamId: "B", homeGoals: 3, awayGoals: 1 },
      { homeTeamId: "C", awayTeamId: "D", homeGoals: 0, awayGoals: 0 },
      { homeTeamId: "A", awayTeamId: "C", homeGoals: 2, awayGoals: 2 },
    ];
    const rows = computeStandings(T, matches);
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a).toMatchObject({
      position: 1,
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 5,
      goalsAgainst: 3,
      goalDiff: 2,
      points: 4,
      form: "WD",
    });
  });

  it("respeta configuración de puntos no estándar (victoria = 2)", () => {
    const rows = computeStandings(["A", "B"], [
      { homeTeamId: "A", awayTeamId: "B", homeGoals: 1, awayGoals: 0 },
    ], { pointsWin: 2 });
    expect(rows[0]!.points).toBe(2);
  });

  it("desempata por diferencia de gol y luego goles a favor", () => {
    const matches: PlayedMatch[] = [
      { homeTeamId: "A", awayTeamId: "C", homeGoals: 4, awayGoals: 0 },
      { homeTeamId: "B", awayTeamId: "D", homeGoals: 2, awayGoals: 0 },
    ];
    const rows = computeStandings(T, matches, { tiebreakers: ["POINTS", "GD", "GF"] });
    expect(rows[0]!.teamId).toBe("A"); // +4 vs +2
  });

  it("desempata por enfrentamiento directo (H2H) antes que GD si se configura", () => {
    // A y B terminan con 6 pts: B ganó el duelo directo, A tiene mejor GD.
    const matches: PlayedMatch[] = [
      { homeTeamId: "B", awayTeamId: "A", homeGoals: 1, awayGoals: 0 },
      { homeTeamId: "A", awayTeamId: "C", homeGoals: 4, awayGoals: 0 },
      { homeTeamId: "A", awayTeamId: "D", homeGoals: 1, awayGoals: 0 },
      { homeTeamId: "B", awayTeamId: "C", homeGoals: 1, awayGoals: 0 },
      { homeTeamId: "D", awayTeamId: "B", homeGoals: 1, awayGoals: 0 },
    ];
    // A: 6 pts, GD +4 · B: 6 pts, GD +1
    const h2hFirst = computeStandings(T, matches, {
      tiebreakers: ["POINTS", "H2H", "GD", "GF"],
    });
    expect(h2hFirst[0]!.teamId).toBe("B"); // H2H: ganó B

    const gdFirst = computeStandings(T, matches, { tiebreakers: ["POINTS", "GD", "GF"] });
    expect(gdFirst[0]!.teamId).toBe("A"); // GD: +4 vs +1
  });

  it("desempata por fair play (menos puntos de sanción gana)", () => {
    const matches: PlayedMatch[] = [
      { homeTeamId: "A", awayTeamId: "B", homeGoals: 1, awayGoals: 1 },
    ];
    const rows = computeStandings(["A", "B"], matches, {
      tiebreakers: ["POINTS", "FAIR_PLAY"],
      fairPlayPoints: { A: 5, B: 2 },
    });
    expect(rows[0]!.teamId).toBe("B");
    expect(rows[0]!.fairPlayPoints).toBe(2);
  });

  it("marca tiedByLot cuando el orden dependió del criterio DRAW", () => {
    const rows = computeStandings(["A", "B"], [], { tiebreakers: ["POINTS", "DRAW"] });
    expect(rows.every((r) => r.tiedByLot)).toBe(true);
  });

  it("ignora partidos de equipos fuera de la tabla (otra etapa/grupo)", () => {
    const rows = computeStandings(["A", "B"], [
      { homeTeamId: "X", awayTeamId: "Y", homeGoals: 9, awayGoals: 0 },
    ]);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it("form solo conserva los últimos 5 resultados", () => {
    const matches: PlayedMatch[] = Array.from({ length: 7 }, (_, i) => ({
      homeTeamId: "A",
      awayTeamId: "B",
      homeGoals: i % 2 === 0 ? 1 : 0,
      awayGoals: i % 2 === 0 ? 0 : 1,
    }));
    const rows = computeStandings(["A", "B"], matches);
    expect(rows[0]!.form).toHaveLength(5);
  });
});
