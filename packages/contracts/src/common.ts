import { z } from "zod";

// ─── Primitivas compartidas ──────────────────────────────────────────────

export const idSchema = z.string().min(1);

export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones");

/** Color hex para branding/uniformes. */
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const urlSchema = z.string().url().max(2048);

// ─── Paginación por cursor (convención de toda la API) ──────────────────

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

// ─── Envelope de error (RFC 9457 problem details, simplificado) ─────────

export const apiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(), // "VALIDATION_ERROR", "FORBIDDEN", "CONFLICT"…
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ─── Enums espejo del schema Prisma (fuente compartida con el front) ────

export const orgRoleSchema = z.enum(["LEAGUE_ADMIN", "REFEREE", "TEAM_MANAGER", "PLAYER"]);
export type OrgRole = z.infer<typeof orgRoleSchema>;

export const matchStatusSchema = z.enum([
  "SCHEDULED",
  "LIVE",
  "HALF_TIME",
  "EXTRA_TIME",
  "PENALTIES",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
  "WALKOVER",
]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const playerPositionSchema = z.enum(["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"]);
export type PlayerPosition = z.infer<typeof playerPositionSchema>;
