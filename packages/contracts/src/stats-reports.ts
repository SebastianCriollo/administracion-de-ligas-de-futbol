import { z } from "zod";
import { idSchema } from "./common";

// ─── Estadísticas (queries de lectura) ───────────────────────────────────

export const statsQuerySchema = z.object({
  tournamentId: idSchema,
  teamId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** Filas de los rankings — respuestas tipadas del módulo stats. */
export interface ScorerRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  penalties: number;
  matchesPlayed: number;
}

export interface AssistRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  assists: number;
}

export interface CardsRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  yellow: number;
  red: number;
}

export interface CleanSheetRow {
  playerId: string; // portero
  playerName: string;
  teamId: string;
  teamName: string;
  cleanSheets: number;
  goalsConceded: number;
  matchesPlayed: number;
}

export interface StreakRow {
  teamId: string;
  teamName: string;
  type: "WIN" | "UNBEATEN" | "SCORING" | "CLEAN_SHEET";
  length: number;
  active: boolean;
}

// ─── Reportes / exportaciones ────────────────────────────────────────────

export const exportFormatSchema = z.enum(["XLSX", "PDF", "CSV"]);

export const createReportSchema = z.object({
  type: z.enum([
    "STANDINGS",
    "SCHEDULE",
    "RESULTS",
    "SCORERS",
    "CARDS",
    "TEAMS",
    "PLAYERS",
    "MATCH_REPORT", // acta oficial de un partido
    "AUDIT",
  ]),
  format: exportFormatSchema,
  tournamentId: idSchema.optional(),
  matchId: idSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// ─── Auditoría ───────────────────────────────────────────────────────────

export const auditQuerySchema = z.object({
  userId: idSchema.optional(),
  entity: z.string().max(60).optional(),
  entityId: idSchema.optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
