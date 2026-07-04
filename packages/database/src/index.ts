import { PrismaClient } from "@prisma/client";

/**
 * Singleton de PrismaClient — evita agotar conexiones con hot-reload en dev.
 * La API (NestJS) lo envuelve en un provider; scripts y seeds lo usan directo.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
