import { z } from "zod";
import { idSchema, slugSchema } from "./common";

// ─── Ligas y temporadas ──────────────────────────────────────────────────

export const createLeagueSchema = z.object({
  name: z.string().min(3).max(80),
  slug: slugSchema.optional(), // derivado del nombre si no llega
  description: z.string().max(2000).optional(),
});
export const updateLeagueSchema = createLeagueSchema.partial().extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "FINISHED"]).optional(),
});

export const createSeasonSchema = z.object({
  name: z.string().min(3).max(60),
  year: z.number().int().min(2000).max(2100),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/** Duplicar temporada: clona estructura, reinicia estadísticas (Fase 1 §7). */
export const duplicateSeasonSchema = z.object({
  sourceSeasonId: idSchema,
  name: z.string().min(3).max(60),
  year: z.number().int().min(2000).max(2100),
  copyTeams: z.boolean().default(true),
  copyRosters: z.boolean().default(true),
});

// ─── Torneos ─────────────────────────────────────────────────────────────

export const tournamentFormatSchema = z.enum([
  "LEAGUE",
  "LEAGUE_PLAYOFFS",
  "KNOCKOUT",
  "GROUPS_KNOCKOUT",
  "CUP",
  "CUSTOM",
]);
export type TournamentFormat = z.infer<typeof tournamentFormatSchema>;

export const tiebreakerSchema = z.enum(["POINTS", "GD", "GF", "H2H", "FAIR_PLAY", "DRAW"]);
export type Tiebreaker = z.infer<typeof tiebreakerSchema>;

/** Configuración de una etapa del wizard (entrada del motor de dominio). */
export const stageConfigSchema = z.object({
  name: z.string().min(2).max(60),
  type: z.enum(["ROUND_ROBIN", "GROUPS", "KNOCKOUT"]),
  legs: z.union([z.literal(1), z.literal(2)]).default(1),
  /** Solo GROUPS: cuántos grupos y clasificados por grupo. */
  groupCount: z.number().int().min(1).max(16).optional(),
  qualifiedPerGroup: z.number().int().min(1).max(8).optional(),
  /** Solo KNOCKOUT. */
  hasExtraTime: z.boolean().default(false),
  hasPenalties: z.boolean().default(true),
  hasThirdPlace: z.boolean().default(false),
});
export type StageConfig = z.infer<typeof stageConfigSchema>;

/** Payload completo del wizard de 6 pasos (Fase 3 §3.1). */
export const createTournamentSchema = z
  .object({
    seasonId: idSchema,
    name: z.string().min(3).max(80),
    slug: slugSchema.optional(),
    format: tournamentFormatSchema,
    startDate: z.coerce.date().optional(),
    pointsWin: z.number().int().min(0).max(10).default(3),
    pointsDraw: z.number().int().min(0).max(10).default(1),
    pointsLoss: z.number().int().min(0).max(10).default(0),
    tiebreakers: z.array(tiebreakerSchema).min(1).default(["POINTS", "GD", "GF", "H2H", "FAIR_PLAY", "DRAW"]),
    /** Solo CUSTOM: etapas explícitas. Los demás formatos las derivan. */
    stages: z.array(stageConfigSchema).optional(),
    teamIds: z.array(idSchema).min(2).max(64),
    /** Restricciones de programación para el generador de calendario. */
    scheduling: z
      .object({
        matchDays: z.array(z.number().int().min(0).max(6)).default([6, 0]), // sáb, dom
        firstMatchTime: z.string().regex(/^\d{2}:\d{2}$/).default("14:00"),
        matchIntervalMinutes: z.number().int().min(60).max(240).default(120),
        venueIds: z.array(idSchema).default([]),
      })
      .optional(),
  })
  .refine((t) => t.format !== "CUSTOM" || (t.stages && t.stages.length > 0), {
    message: "El formato CUSTOM requiere definir las etapas",
    path: ["stages"],
  });
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "IN_PROGRESS", "FINISHED", "CANCELLED"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const tournamentQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "IN_PROGRESS", "FINISHED", "CANCELLED"]).optional(),
  seasonId: idSchema.optional(),
  format: tournamentFormatSchema.optional(),
});
