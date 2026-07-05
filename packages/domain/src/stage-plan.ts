/**
 * Deriva el plan de etapas de cada formato estándar del catálogo.
 * El formato CUSTOM no pasa por aquí: sus etapas llegan explícitas del wizard.
 */

export type TournamentFormat =
  | "LEAGUE"
  | "LEAGUE_PLAYOFFS"
  | "KNOCKOUT"
  | "GROUPS_KNOCKOUT"
  | "CUP"
  | "CUSTOM";

export interface StagePlan {
  name: string;
  type: "ROUND_ROBIN" | "GROUPS" | "KNOCKOUT";
  order: number;
  legs: 1 | 2;
  groupCount?: number;
  qualifiedPerGroup?: number;
  /** KNOCKOUT: cuántos entran a la llave (potencia de 2 recomendada). */
  entrants?: number;
  hasThirdPlace?: boolean;
}

export interface StagePlanOptions {
  legs?: 1 | 2;
  /** LEAGUE_PLAYOFFS: cuántos clasifican al playoff (default 4). */
  playoffSize?: number;
  /** GROUPS_KNOCKOUT: nº de grupos (default: equipos/4). */
  groupCount?: number;
  qualifiedPerGroup?: number;
}

export function buildStagePlan(
  format: TournamentFormat,
  teamCount: number,
  options: StagePlanOptions = {},
): StagePlan[] {
  const legs = options.legs ?? 1;
  if (teamCount < 2) throw new Error("Se requieren al menos 2 equipos");

  switch (format) {
    case "LEAGUE":
      return [{ name: "Todos contra todos", type: "ROUND_ROBIN", order: 1, legs }];

    case "LEAGUE_PLAYOFFS": {
      const playoffSize = options.playoffSize ?? Math.min(4, teamCount);
      return [
        { name: "Fase regular", type: "ROUND_ROBIN", order: 1, legs },
        {
          name: "Playoffs",
          type: "KNOCKOUT",
          order: 2,
          legs: 1,
          entrants: playoffSize,
          hasThirdPlace: false,
        },
      ];
    }

    case "KNOCKOUT":
    case "CUP":
      return [
        {
          name: "Eliminación directa",
          type: "KNOCKOUT",
          order: 1,
          legs: 1,
          entrants: teamCount,
          hasThirdPlace: format === "CUP",
        },
      ];

    case "GROUPS_KNOCKOUT": {
      const groupCount = options.groupCount ?? Math.max(2, Math.floor(teamCount / 4));
      const qualified = options.qualifiedPerGroup ?? 2;
      return [
        {
          name: "Fase de grupos",
          type: "GROUPS",
          order: 1,
          legs,
          groupCount,
          qualifiedPerGroup: qualified,
        },
        {
          name: "Fase final",
          type: "KNOCKOUT",
          order: 2,
          legs: 1,
          entrants: groupCount * qualified,
          hasThirdPlace: true,
        },
      ];
    }

    case "CUSTOM":
      throw new Error("CUSTOM define sus etapas explícitamente en el wizard");
  }
}

/**
 * Cruces grupos → llaves: A1-B2, B1-A2, C1-D2, D1-C2… (patrón mundialista,
 * evita que dos del mismo grupo se crucen en la primera ronda).
 */
export function crossGroupQualifiers(
  groupWinners: readonly string[][], // por grupo, ordenados por posición
  qualifiedPerGroup: number,
): [string, string][] {
  const pairs: [string, string][] = [];
  const g = groupWinners.length;
  if (g % 2 !== 0 && qualifiedPerGroup > 1) {
    throw new Error("El cruce estándar requiere un nº par de grupos");
  }
  for (let i = 0; i < g; i += 2) {
    const groupA = groupWinners[i]!;
    const groupB = groupWinners[i + 1] ?? groupWinners[0]!;
    for (let q = 0; q < qualifiedPerGroup; q++) {
      const a = groupA[q];
      const b = groupB[qualifiedPerGroup - 1 - q];
      if (!a || !b) throw new Error("Faltan clasificados para el cruce");
      // Alterna el orden para repartir la "localía" de la llave.
      pairs.push(q % 2 === 0 ? [a, b] : [b, a]);
    }
  }
  return pairs;
}
