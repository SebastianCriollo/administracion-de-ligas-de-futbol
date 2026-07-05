/**
 * Modalidades de fútbol soportadas y sus reglas base.
 * El torneo puede sobreescribir duración/cambios vía Tournament.rules;
 * jugadores en cancha y mínimo legal son fijos por modalidad.
 */

export type Modality =
  | "FUTBOL_11"
  | "FUTBOL_9"
  | "FUTBOL_8"
  | "FUTBOL_7"
  | "FUTBOL_6"
  | "FUTBOL_5"
  | "FUTSAL"
  | "BEACH_SOCCER";

export interface ModalityConfig {
  label: string;
  /** Titulares exactos que exige la alineación. */
  playersOnField: number;
  /** Menos que esto en cancha ⇒ W.O. / suspensión (regla configurable). */
  minPlayersToPlay: number;
  /** Duración regular por periodo, en minutos. */
  periodMinutes: number;
  periods: number;
  /** null = cambios ilimitados (habitual en amateur y fútbol reducido). */
  maxSubstitutions: number | null;
  /** Prórroga por defecto si el torneo la habilita. */
  extraTimeMinutes: number;
}

export const MODALITY_CONFIG: Record<Modality, ModalityConfig> = {
  FUTBOL_11: {
    label: "Fútbol 11",
    playersOnField: 11,
    minPlayersToPlay: 7,
    periodMinutes: 45,
    periods: 2,
    maxSubstitutions: 5,
    extraTimeMinutes: 15,
  },
  FUTBOL_9: {
    label: "Fútbol 9",
    playersOnField: 9,
    minPlayersToPlay: 6,
    periodMinutes: 40,
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 10,
  },
  FUTBOL_8: {
    label: "Fútbol 8",
    playersOnField: 8,
    minPlayersToPlay: 5,
    periodMinutes: 35,
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 10,
  },
  FUTBOL_7: {
    label: "Fútbol 7",
    playersOnField: 7,
    minPlayersToPlay: 5,
    periodMinutes: 30,
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 10,
  },
  FUTBOL_6: {
    label: "Fútbol 6",
    playersOnField: 6,
    minPlayersToPlay: 4,
    periodMinutes: 25,
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 5,
  },
  FUTBOL_5: {
    label: "Fútbol 5 / Indor",
    playersOnField: 5,
    minPlayersToPlay: 3,
    periodMinutes: 25,
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 5,
  },
  FUTSAL: {
    label: "Futsal (FIFA)",
    playersOnField: 5,
    minPlayersToPlay: 3,
    periodMinutes: 20, // cronómetro detenido
    periods: 2,
    maxSubstitutions: null,
    extraTimeMinutes: 5,
  },
  BEACH_SOCCER: {
    label: "Fútbol playa",
    playersOnField: 5,
    minPlayersToPlay: 3,
    periodMinutes: 12,
    periods: 3,
    maxSubstitutions: null,
    extraTimeMinutes: 3,
  },
};
