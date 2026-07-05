import { z } from "zod";
import { hexColorSchema, orgRoleSchema, slugSchema } from "./common";

export const updateOrganizationSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  slug: slugSchema.optional(),
  primaryColor: hexColorSchema.optional(),
  country: z.string().max(60).optional(),
  city: z.string().max(80).optional(),
  timezone: z.string().max(60).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: orgRoleSchema,
  teamId: z.string().optional(), // TEAM_MANAGER / PLAYER
  playerId: z.string().optional(),
  refereeId: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  matchReminders: z.boolean().default(true),
  results: z.boolean().default(true),
  news: z.boolean().default(false),
});
