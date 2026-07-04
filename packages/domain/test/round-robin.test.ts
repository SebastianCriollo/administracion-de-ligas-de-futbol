import { describe, expect, it } from "vitest";
import { generateRoundRobin } from "../src/round-robin";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`);

function allPairs(rounds: ReturnType<typeof generateRoundRobin>) {
  return rounds.flatMap((r) => r.pairings);
}

describe("generateRoundRobin", () => {
  it("nº par: n-1 jornadas, n/2 partidos por jornada", () => {
    const rounds = generateRoundRobin(teams(8));
    expect(rounds).toHaveLength(7);
    for (const r of rounds) expect(r.pairings).toHaveLength(4);
  });

  it("nº impar: n jornadas y un descanso por jornada", () => {
    const rounds = generateRoundRobin(teams(7));
    expect(rounds).toHaveLength(7);
    for (const r of rounds) expect(r.pairings).toHaveLength(3); // uno descansa
  });

  it("cada par de equipos se enfrenta exactamente una vez", () => {
    const rounds = generateRoundRobin(teams(8));
    const seen = new Set<string>();
    for (const { home, away } of allPairs(rounds)) {
      const key = [home, away].sort().join("-");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe((8 * 7) / 2);
  });

  it("ningún equipo juega dos veces en la misma jornada", () => {
    for (const n of [4, 5, 6, 7, 8, 9, 12, 16]) {
      const rounds = generateRoundRobin(teams(n));
      for (const round of rounds) {
        const ids = round.pairings.flatMap((p) => [p.home, p.away]);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("ida y vuelta: duplica jornadas e invierte localías", () => {
    const rounds = generateRoundRobin(teams(6), { legs: 2 });
    expect(rounds).toHaveLength(10);
    const first = rounds[0]!.pairings[0]!;
    const mirrored = rounds[5]!.pairings[0]!;
    expect(mirrored.home).toBe(first.away);
    expect(mirrored.away).toBe(first.home);
  });

  it("localías razonablemente equilibradas (diferencia ≤ 2)", () => {
    const rounds = generateRoundRobin(teams(8));
    const homeCount = new Map<string, number>();
    for (const { home } of allPairs(rounds)) {
      homeCount.set(home, (homeCount.get(home) ?? 0) + 1);
    }
    const counts = [...homeCount.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  it("es determinista", () => {
    expect(generateRoundRobin(teams(9))).toEqual(generateRoundRobin(teams(9)));
  });

  it("rechaza duplicados y menos de 2 equipos", () => {
    expect(() => generateRoundRobin(["A", "A"])).toThrow();
    expect(() => generateRoundRobin(["A"])).toThrow();
  });
});
