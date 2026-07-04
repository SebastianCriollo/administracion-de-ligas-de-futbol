import { z } from "zod";
import { idSchema, playerPositionSchema } from "./common";

// ─── Programación ────────────────────────────────────────────────────────

export const scheduleMatchSchema = z.object({
  scheduledAt: z.coerce.date(),
  venueId: idSchema.optional(),
});

/** Cambio de horario/cancha — notifica a equipos y árbitros (Fase 3). */
export const rescheduleMatchSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  venueId: idSchema.optional(),
  reason: z.string().max(300).optional(),
});

export const matchQuerySchema = z.object({
  tournamentId: idSchema.optional(),
  teamId: idSchema.optional(),
  refereeId: idSchema.optional(),
  venueId: idSchema.optional(),
  status: z
    .enum([
      "SCHEDULED",
      "LIVE",
      "HALF_TIME",
      "EXTRA_TIME",
      "PENALTIES",
      "FINISHED",
      "POSTPONED",
      "CANCELLED",
      "WALKOVER",
    ])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ─── Designación arbitral ────────────────────────────────────────────────

export const assignOfficialSchema = z.object({
  refereeId: idSchema,
  role: z.enum(["REFEREE", "ASSISTANT_1", "ASSISTANT_2", "FOURTH_OFFICIAL"]).default("REFEREE"),
});

export const respondAssignmentSchema = z.object({
  status: z.enum(["CONFIRMED", "DECLINED"]),
});

// ─── Convocatoria y alineación ───────────────────────────────────────────

export const createCallupSchema = z.object({
  playerIds: z.array(idSchema).min(1).max(30),
  notes: z.string().max(500).optional(),
});

export const respondCallupSchema = z.object({
  status: z.enum(["CONFIRMED", "DECLINED"]),
});

export const lineupPlayerSchema = z.object({
  playerId: idSchema,
  shirtNumber: z.number().int().min(1).max(99),
  isStarter: z.boolean(),
  position: playerPositionSchema.optional(),
  gridX: z.number().min(0).max(100).optional(),
  gridY: z.number().min(0).max(100).optional(),
});

export const submitLineupSchema = z
  .object({
    formation: z.string().regex(/^\d(-\d){1,4}$/).optional(), // "4-3-3"
    players: z.array(lineupPlayerSchema).min(4).max(30),
  })
  // El nº exacto de titulares depende de la modalidad del torneo (11/9/8/7/6/5);
  // el servicio lo valida contra MODALITY_CONFIG de @ligas/domain.
  .refine(
    (l) => {
      const starters = l.players.filter((p) => p.isStarter).length;
      return starters >= 4 && starters <= 11;
    },
    { message: "Titulares fuera de rango para cualquier modalidad", path: ["players"] },
  )
  .refine((l) => new Set(l.players.map((p) => p.shirtNumber)).size === l.players.length, {
    message: "Dorsales duplicados en la alineación",
    path: ["players"],
  });
export type SubmitLineupInput = z.infer<typeof submitLineupSchema>;

// ─── Acta digital: eventos en vivo ───────────────────────────────────────

export const matchEventTypeSchema = z.enum([
  "GOAL",
  "OWN_GOAL",
  "PENALTY_GOAL",
  "PENALTY_MISSED",
  "YELLOW_CARD",
  "SECOND_YELLOW",
  "RED_CARD",
  "SUBSTITUTION",
  "INJURY",
  "INCIDENT",
  "SHOOTOUT_GOAL",
  "SHOOTOUT_MISS",
]);
export type MatchEventType = z.infer<typeof matchEventTypeSchema>;

export const createMatchEventSchema = z
  .object({
    type: matchEventTypeSchema,
    minute: z.number().int().min(0).max(150).optional(),
    extraMinute: z.number().int().min(1).max(20).optional(),
    teamId: idSchema.optional(),
    playerId: idSchema.optional(),
    secondaryPlayerId: idSchema.optional(), // asistente / jugador que sale
    note: z.string().max(300).optional(),
  })
  .refine((e) => e.type === "INCIDENT" || e.teamId !== undefined, {
    message: "El evento requiere equipo",
    path: ["teamId"],
  })
  .refine((e) => e.type !== "SUBSTITUTION" || (e.playerId && e.secondaryPlayerId), {
    message: "El cambio requiere jugador que entra y que sale",
    path: ["secondaryPlayerId"],
  });
export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>;

// ─── Transiciones de estado del partido (máquina de estados, Fase 1) ────

export const matchTransitionSchema = z.object({
  action: z.enum([
    "START", // SCHEDULED → LIVE
    "HALF_TIME", // LIVE → HALF_TIME
    "RESUME", // HALF_TIME → LIVE
    "START_EXTRA_TIME", // LIVE → EXTRA_TIME
    "START_PENALTIES", // EXTRA_TIME|LIVE → PENALTIES
    "FINISH", // → FINISHED
    "POSTPONE",
    "CANCEL",
    "WALKOVER",
  ]),
  /** Para WALKOVER: equipo ganador. */
  winnerTeamId: idSchema.optional(),
});
export type MatchTransitionInput = z.infer<typeof matchTransitionSchema>;

// ─── Acta ────────────────────────────────────────────────────────────────

export const closeReportSchema = z.object({
  observations: z.string().max(2000).optional(),
  incidents: z.string().max(2000).optional(),
  bestPlayerId: idSchema.optional(),
  attendance: z.number().int().min(0).optional(),
});
