/**
 * Máquina de estados del partido (Fase 1 §3). Las transiciones inválidas
 * se rechazan aquí, no en la base de datos.
 */

export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "HALF_TIME"
  | "EXTRA_TIME"
  | "PENALTIES"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED"
  | "WALKOVER";

export type MatchAction =
  | "START"
  | "HALF_TIME"
  | "RESUME"
  | "START_EXTRA_TIME"
  | "START_PENALTIES"
  | "FINISH"
  | "POSTPONE"
  | "CANCEL"
  | "WALKOVER";

const TRANSITIONS: Record<MatchAction, Partial<Record<MatchStatus, MatchStatus>>> = {
  START: { SCHEDULED: "LIVE", POSTPONED: "LIVE" },
  HALF_TIME: { LIVE: "HALF_TIME", EXTRA_TIME: "HALF_TIME" },
  RESUME: { HALF_TIME: "LIVE" },
  START_EXTRA_TIME: { LIVE: "EXTRA_TIME", HALF_TIME: "EXTRA_TIME" },
  START_PENALTIES: { LIVE: "PENALTIES", EXTRA_TIME: "PENALTIES" },
  FINISH: { LIVE: "FINISHED", EXTRA_TIME: "FINISHED", PENALTIES: "FINISHED" },
  POSTPONE: { SCHEDULED: "POSTPONED" },
  CANCEL: { SCHEDULED: "CANCELLED", POSTPONED: "CANCELLED" },
  WALKOVER: { SCHEDULED: "WALKOVER", POSTPONED: "WALKOVER" },
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: MatchStatus,
    public readonly action: MatchAction,
  ) {
    super(`Transición inválida: ${action} desde ${from}`);
    this.name = "InvalidTransitionError";
  }
}

export function transition(from: MatchStatus, action: MatchAction): MatchStatus {
  const to = TRANSITIONS[action][from];
  if (!to) throw new InvalidTransitionError(from, action);
  return to;
}

export function canTransition(from: MatchStatus, action: MatchAction): boolean {
  return TRANSITIONS[action][from] !== undefined;
}

/** Estados en los que el árbitro puede registrar eventos. */
export const EVENT_RECORDING_STATUSES: readonly MatchStatus[] = [
  "LIVE",
  "HALF_TIME",
  "EXTRA_TIME",
  "PENALTIES",
];

/** Estados terminales: el resultado ya no cambia sin intervención admin. */
export const TERMINAL_STATUSES: readonly MatchStatus[] = ["FINISHED", "CANCELLED", "WALKOVER"];
