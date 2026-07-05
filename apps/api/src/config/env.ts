import { z } from "zod";

/** Validación de entorno al arrancar: la API no bootea con config inválida. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).default("dev-secret-change-me-in-production!!"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  WEB_URL: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Ligas <noreply@ligas.app>"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuración de entorno inválida:\n${issues.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}
