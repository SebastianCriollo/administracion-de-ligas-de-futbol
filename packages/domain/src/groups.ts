import { generateRoundRobin, type FixtureRound } from "./round-robin";

export interface GroupFixture {
  /** "A", "B", … */
  name: string;
  teamIds: string[];
  rounds: FixtureRound[];
}

export interface GroupsOptions {
  groupCount: number;
  legs?: 1 | 2;
}

const GROUP_NAMES = "ABCDEFGHIJKLMNOP";

/**
 * Reparte equipos (ya ordenados por sembrado) en grupos con patrón
 * serpiente — los cabezas de serie quedan separados — y genera el
 * round-robin de cada grupo.
 */
export function generateGroups(
  seededTeamIds: readonly string[],
  options: GroupsOptions,
): GroupFixture[] {
  const { groupCount, legs = 1 } = options;
  if (groupCount < 1 || groupCount > GROUP_NAMES.length) {
    throw new Error(`groupCount fuera de rango (1-${GROUP_NAMES.length})`);
  }
  if (seededTeamIds.length < groupCount * 2) {
    throw new Error("Cada grupo necesita al menos 2 equipos");
  }

  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  seededTeamIds.forEach((teamId, i) => {
    const row = Math.floor(i / groupCount);
    const col = i % groupCount;
    // serpiente: filas impares se recorren al revés
    const g = row % 2 === 0 ? col : groupCount - 1 - col;
    buckets[g]!.push(teamId);
  });

  return buckets.map((teamIds, i) => ({
    name: GROUP_NAMES[i]!,
    teamIds,
    rounds: generateRoundRobin(teamIds, { legs }),
  }));
}
