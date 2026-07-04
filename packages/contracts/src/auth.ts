import { z } from "zod";
import { orgRoleSchema } from "./common";

export const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(128)
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[0-9]/, "Debe incluir un número");

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Registro de organizador: crea usuario + organización en un paso. */
export const registerSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  organizationName: z.string().min(3).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  password: passwordSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Payload del access token (JWT). */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  globalRole: "SUPER_ADMIN" | "USER";
  /** rol por organización: { [organizationId]: OrgRole[] } */
  orgs: Record<string, z.infer<typeof orgRoleSchema>[]>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
