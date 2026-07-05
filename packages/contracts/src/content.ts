import { z } from "zod";
import { idSchema, slugSchema } from "./common";

// ─── Noticias ────────────────────────────────────────────────────────────

export const createNewsSchema = z.object({
  title: z.string().min(5).max(160),
  slug: slugSchema.optional(),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(20).max(50000),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});
export const updateNewsSchema = createNewsSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

// ─── Galería ─────────────────────────────────────────────────────────────

export const createAlbumSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

/** El archivo sube por presigned URL; esto registra el asset ya subido. */
export const registerAssetSchema = z.object({
  albumId: idSchema.optional(),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().max(160).optional(),
  sizeBytes: z.number().int().min(0).optional(),
  mimeType: z.string().max(100).optional(),
});

/** Solicitud de presigned URL para subida directa a S3/Supabase. */
export const presignUploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "application/pdf",
  ]),
  sizeBytes: z.number().int().min(1).max(100 * 1024 * 1024), // 100 MB
});

// ─── Reglamentos ─────────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  tournamentId: idSchema.optional(),
  title: z.string().min(3).max(160),
  fileUrl: z.string().url(),
});
