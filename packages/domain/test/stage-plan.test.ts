import { describe, expect, it } from "vitest";
import { generateGroups } from "../src/groups";
import { buildStagePlan, crossGroupQualifiers } from "../src/stage-plan";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`);

describe("buildStagePlan", () => {
  it("LEAGUE: una etapa round-robin", () => {
    expect(buildStagePlan("LEAGUE", 10, { legs: 2 })).toEqual([
      { name: "Todos contra todos", type: "ROUND_ROBIN", order: 1, legs: 2 },
    ]);
  });

  it("LEAGUE_PLAYOFFS: fase regular + llave de 4 por defecto", () => {
    const plan = buildStagePlan("LEAGUE_PLAYOFFS", 10);
    expect(plan).toHaveLength(2);
    expect(plan[1]).toMatchObject({ type: "KNOCKOUT", entrants: 4 });
  });

  it("CUP incluye tercer puesto; KNOCKOUT no", () => {
    expect(buildStagePlan("CUP", 16)[0]!.hasThirdPlace).toBe(true);
    expect(buildStagePlan("KNOCKOUT", 16)[0]!.hasThirdPlace).toBe(false);
  });

  it("GROUPS_KNOCKOUT: deriva grupos y entrantes de la fase final", () => {
    const plan = buildStagePlan("GROUPS_KNOCKOUT", 16, { groupCount: 4, qualifiedPerGroup: 2 });
    expect(plan[0]).toMatchObject({ type: "GROUPS", groupCount: 4, qualifiedPerGroup: 2 });
    expect(plan[1]).toMatchObject({ type: "KNOCKOUT", entrants: 8, hasThirdPlace: true });
  });
});

describe("generateGroups", () => {
  it("distribución serpiente: cabezas de serie separados", () => {
    const groups = generateGroups(teams(8), { groupCount: 2 });
    expect(groups[0]!.teamIds).toContain("T1");
    expect(groups[1]!.teamIds).toContain("T2");
    expect(groups[0]!.teamIds).toHaveLength(4);
    // serpiente: G0=[T1,T4,T5,T8], G1=[T2,T3,T6,T7]
    expect(groups[0]!.teamIds).toEqual(["T1", "T4", "T5", "T8"]);
  });

  it("cada grupo genera su propio round-robin", () => {
    const groups = generateGroups(teams(8), { groupCount: 2 });
    for (const g of groups) expect(g.rounds).toHaveLength(3);
  });
});

describe("crossGroupQualifiers", () => {
  it("cruce mundialista: A1-B2 y B1-A2", () => {
    const pairs = crossGroupQualifiers(
      [
        ["A1", "A2"],
        ["B1", "B2"],
      ],
      2,
    );
    expect(pairs).toContainEqual(["A1", "B2"]);
    expect(pairs).toContainEqual(["B1", "A2"]);
    // nunca dos del mismo grupo en primera ronda
    for (const [x, y] of pairs) expect(x[0]).not.toBe(y[0]);
  });
});
