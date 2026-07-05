/**
 * Generador de llaves de eliminación directa con sembrado y byes.
 * Produce el bracket completo (todas las rondas) con vínculos de
 * progresión — los partidos futuros saben de qué llave viene cada lado.
 */

export interface MatchSlot {
  /** Ronda 1-based desde la primera. La última es la final. */
  round: number;
  /** Posición dentro de la ronda, 0-based (para dibujar el bracket). */
  slot: number;
  /** Equipo conocido (solo ronda 1, o resuelto por bye). */
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** De qué partido de la ronda anterior viene cada lado. */
  homeSource: SourceRef | null;
  awaySource: SourceRef | null;
  /** true si la llave quedó resuelta por bye (un solo participante). */
  isBye: boolean;
}

export interface SourceRef {
  round: number;
  slot: number;
  /** WINNER avanza; LOSER solo para el tercer puesto. */
  take: "WINNER" | "LOSER";
}

export interface KnockoutBracket {
  /** rounds[0] = primera ronda, última = final. */
  rounds: MatchSlot[][];
  thirdPlace: MatchSlot | null;
  /** Nombre sugerido por ronda: "Octavos", "Cuartos", "Semifinal", "Final". */
  roundNames: string[];
}

export interface KnockoutOptions {
  thirdPlace?: boolean;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Final",
  2: "Semifinales",
  4: "Cuartos de final",
  8: "Octavos de final",
  16: "Dieciseisavos",
};

/**
 * Orden de posiciones con sembrado estándar: el 1 y el 2 solo pueden
 * cruzarse en la final; los byes (cuando n < potencia de 2) caen en los
 * mejores sembrados. Algoritmo clásico de expansión por espejo.
 */
export function seedOrder(bracketSize: number): number[] {
  let order = [1];
  while (order.length < bracketSize) {
    const next: number[] = [];
    const size = order.length * 2;
    for (const s of order) {
      next.push(s, size + 1 - s);
    }
    order = next;
  }
  return order;
}

export function generateKnockout(
  seededTeamIds: readonly string[],
  options: KnockoutOptions = {},
): KnockoutBracket {
  const n = seededTeamIds.length;
  if (n < 2) throw new Error("Se requieren al menos 2 equipos");
  if (new Set(seededTeamIds).size !== n) throw new Error("Equipos duplicados");

  const bracketSize = 2 ** Math.ceil(Math.log2(n));
  const totalRounds = Math.log2(bracketSize);
  const order = seedOrder(bracketSize);

  // Posiciones del bracket: seed → equipo, o null (bye) si seed > n.
  const positions: (string | null)[] = order.map((seed) =>
    seed <= n ? (seededTeamIds[seed - 1] ?? null) : null,
  );

  const rounds: MatchSlot[][] = [];

  // Primera ronda
  const first: MatchSlot[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const home = positions[i * 2] ?? null;
    const away = positions[i * 2 + 1] ?? null;
    first.push({
      round: 1,
      slot: i,
      homeTeamId: home,
      awayTeamId: away,
      homeSource: null,
      awaySource: null,
      isBye: home === null || away === null,
    });
  }
  rounds.push(first);

  // Rondas siguientes, con propagación inmediata de byes.
  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2]!;
    const current: MatchSlot[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const left = prev[i * 2]!;
      const right = prev[i * 2 + 1]!;
      const homeFromBye = left.isBye ? (left.homeTeamId ?? left.awayTeamId) : null;
      const awayFromBye = right.isBye ? (right.homeTeamId ?? right.awayTeamId) : null;
      current.push({
        round: r,
        slot: i,
        homeTeamId: homeFromBye,
        awayTeamId: awayFromBye,
        homeSource: left.isBye ? null : { round: r - 1, slot: left.slot, take: "WINNER" },
        awaySource: right.isBye ? null : { round: r - 1, slot: right.slot, take: "WINNER" },
        isBye: false,
      });
    }
    rounds.push(current);
  }

  const roundNames = rounds.map((round) => {
    const matchCount = round.length;
    return ROUND_NAMES[matchCount] ?? `Ronda de ${matchCount * 2}`;
  });

  let thirdPlace: MatchSlot | null = null;
  if (options.thirdPlace && totalRounds >= 2) {
    const semis = rounds[totalRounds - 2]!;
    thirdPlace = {
      round: totalRounds,
      slot: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeSource: { round: totalRounds - 1, slot: semis[0]!.slot, take: "LOSER" },
      awaySource: { round: totalRounds - 1, slot: semis[1]!.slot, take: "LOSER" },
      isBye: false,
    };
  }

  return { rounds, thirdPlace, roundNames };
}
