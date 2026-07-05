import { z } from "zod";
import { idSchema, playerPositionSchema } from "./common";

export const createPlayerSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  birthDate: z.coerce.date().optional(),
  nationality: z.string().max(60).optional(),
  documentId: z.string().max(20).optional(),
  heightCm: z.number().int().min(120).max(230).optional(),
  weightKg: z.number().int().min(35).max(160).optional(),
  position: playerPositionSchema,
  dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  email: z.string().email().optional(), // invitación para que vea sus stats
});
export const updatePlayerSchema = createPlayerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/** Alta en plantilla (equipo + temporada + dorsal). */
export const addToRosterSchema = z.object({
  teamId: idSchema,
  seasonId: idSchema.optional(),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  isCaptain: z.boolean().default(false),
});

export const createTransferSchema = z.object({
  playerId: idSchema,
  toTeamId: idSchema,
  date: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
});

export const createInjurySchema = z.object({
  description: z.string().min(3).max(500),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const playerQuerySchema = z.object({
  teamId: idSchema.optional(),
  position: playerPositionSchema.optional(),
  search: z.string().max(80).optional(),
  isActive: z.coerce.boolean().optional(),
});
