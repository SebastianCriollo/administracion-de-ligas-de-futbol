/**
 * Generador de fixture todos-contra-todos (método del círculo).
 * Puro y determinista: mismos equipos ⇒ mismo fixture.
 */

export interface Pairing {
  home: string;
  away: string;
}

export interface FixtureRound {
  number: number; // 1-based
  pairings: Pairing[];
}

export interface RoundRobinOptions {
  /** 1 = solo ida, 2 = ida y vuelta (la vuelta invierte localías). */
  legs?: 1 | 2;
}

/**
 * Método del círculo: se fija el primer equipo y el resto rota.
 * Con nº impar de equipos se inserta un BYE (descansa uno por jornada).
 * La localía del equipo fijo se alterna por jornada para equilibrar.
 */
export function generateRoundRobin(
  teamIds: readonly string[],
  options: RoundRobinOptions = {},
): FixtureRound[] {
  const legs = options.legs ?? 1;
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error("Equipos duplicados en el fixture");
  }
  if (teamIds.length < 2) {
    throw new Error("Se requieren al menos 2 equipos");
  }

  const BYE = null;
  const slots: (string | null)[] = [...teamIds];
  if (slots.length % 2 !== 0) slots.push(BYE);

  const n = slots.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;
  const rounds: FixtureRound[] = [];

  const fixed = slots[0]!;
  let rotating = slots.slice(1);

  for (let r = 0; r < roundsPerLeg; r++) {
    const pairings: Pairing[] = [];

    // Emparejamiento del fijo con el primero del anillo (alternando localía).
    const opponent = rotating[rotating.length - 1] ?? null;
    if (opponent !== null) {
      pairings.push(r % 2 === 0 ? { home: fixed, away: opponent } : { home: opponent, away: fixed });
    }

    // Resto del anillo: extremos hacia el centro.
    for (let i = 0; i < half - 1; i++) {
      const a = rotating[i] ?? null;
      const b = rotating[rotating.length - 2 - i] ?? null;
      if (a === null || b === null) continue; // uno descansa (BYE)
      // Alterna localía por paridad para repartir partidos en casa.
      pairings.push(i % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }

    rounds.push({ number: r + 1, pairings });
    rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
  }

  if (legs === 2) {
    const secondLeg = rounds.map((round, i) => ({
      number: roundsPerLeg + i + 1,
      pairings: round.pairings.map((p) => ({ home: p.away, away: p.home })),
    }));
    rounds.push(...secondLeg);
  }

  return rounds;
}
