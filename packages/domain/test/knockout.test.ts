import { describe, expect, it } from "vitest";
import { generateKnockout, seedOrder } from "../src/knockout";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`);

describe("seedOrder", () => {
  it("separa a los dos mejores sembrados en mitades opuestas", () => {
    const order = seedOrder(8);
    expect(order).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    const half = order.length / 2;
    expect(order.slice(0, half)).toContain(1);
    expect(order.slice(half)).toContain(2);
  });
});

describe("generateKnockout", () => {
  it("8 equipos: 3 rondas (cuartos, semis, final)", () => {
    const b = generateKnockout(teams(8));
    expect(b.rounds).toHaveLength(3);
    expect(b.rounds[0]).toHaveLength(4);
    expect(b.rounds[1]).toHaveLength(2);
    expect(b.rounds[2]).toHaveLength(1);
    expect(b.roundNames).toEqual(["Cuartos de final", "Semifinales", "Final"]);
  });

  it("sembrado clásico: 1 vs 8 en la primera llave, 1 y 2 solo en la final", () => {
    const b = generateKnockout(teams(8));
    const first = b.rounds[0]!;
    expect(first[0]).toMatchObject({ homeTeamId: "S1", awayTeamId: "S8" });
    const topHalf = first.slice(0, 2).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
    const bottomHalf = first.slice(2).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
    expect(topHalf).toContain("S1");
    expect(bottomHalf).toContain("S2");
  });

  it("6 equipos: byes para los 2 mejores, que arrancan en semis", () => {
    const b = generateKnockout(teams(6));
    expect(b.rounds).toHaveLength(3); // bracket de 8
    const byes = b.rounds[0]!.filter((m) => m.isBye);
    expect(byes).toHaveLength(2);
    // S1 y S2 avanzan directo: aparecen ya resueltos en semifinales
    const semiTeams = b.rounds[1]!.flatMap((m) => [m.homeTeamId, m.awayTeamId]);
    expect(semiTeams).toContain("S1");
    expect(semiTeams).toContain("S2");
  });

  it("los partidos futuros llevan vínculo de progresión (source)", () => {
    const b = generateKnockout(teams(8));
    const final = b.rounds[2]![0]!;
    expect(final.homeSource).toEqual({ round: 2, slot: 0, take: "WINNER" });
    expect(final.awaySource).toEqual({ round: 2, slot: 1, take: "WINNER" });
    expect(final.homeTeamId).toBeNull();
  });

  it("tercer puesto: perdedores de ambas semifinales", () => {
    const b = generateKnockout(teams(8), { thirdPlace: true });
    expect(b.thirdPlace).not.toBeNull();
    expect(b.thirdPlace!.homeSource!.take).toBe("LOSER");
    expect(b.thirdPlace!.awaySource!.take).toBe("LOSER");
  });

  it("2 equipos: solo la final, sin tercer puesto posible", () => {
    const b = generateKnockout(teams(2), { thirdPlace: true });
    expect(b.rounds).toHaveLength(1);
    expect(b.thirdPlace).toBeNull();
  });
});
