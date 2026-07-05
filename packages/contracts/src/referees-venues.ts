import { z } from "zod";

// ─── Árbitros ────────────────────────────────────────────────────────────

export const createRefereeSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  category: z.enum(["FIFA", "NATIONAL", "REGIONAL", "LOCAL"]).default("LOCAL"),
  experienceYears: z.number().int().min(0).max(60).default(0),
  email: z.string().email().optional(), // invitación para acta digital
});
export const updateRefereeSchema = createRefereeSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

/** Calificación post-partido del desempeño arbitral. */
export const rateOfficialSchema = z.object({
  rating: z.number().min(1).max(10),
});

// ─── Escenarios deportivos ───────────────────────────────────────────────

export const createVenueSchema = z.object({
  name: z.string().min(3).max(120),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().min(0).max(200000).optional(),
  surface: z.string().max(60).optional(),
});
export const updateVenueSchema = createVenueSchema.partial().extend({
  status: z.enum(["AVAILABLE", "MAINTENANCE", "CLOSED"]).optional(),
});
