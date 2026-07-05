import { z } from "zod";
import { hexColorSchema, idSchema, slugSchema, urlSchema } from "./common";

export const kitSchema = z.object({
  type: z.enum(["home", "away", "third"]),
  shirt: hexColorSchema,
  shorts: hexColorSchema,
  socks: hexColorSchema,
});

export const createTeamSchema = z.object({
  name: z.string().min(2).max(80),
  shortName: z.string().min(2).max(5).toUpperCase().optional(),
  slug: slugSchema.optional(),
  city: z.string().max(80).optional(),
  foundedYear: z.number().int().min(1850).max(2100).optional(),
  history: z.string().max(5000).optional(),
  homeVenueId: idSchema.optional(),
  kits: z.array(kitSchema).max(3).default([]),
  socialLinks: z
    .object({
      instagram: urlSchema.optional(),
      facebook: urlSchema.optional(),
      x: urlSchema.optional(),
    })
    .default({}),
});
export const updateTeamSchema = createTeamSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createStaffSchema = z.object({
  name: z.string().min(3).max(120),
  role: z.enum(["COACH", "ASSISTANT_COACH", "MANAGER", "PHYSIO"]),
  email: z.string().email().optional(), // dispara invitación si llega
});

export const createSponsorSchema = z.object({
  name: z.string().min(2).max(80),
  website: urlSchema.optional(),
});
