/**
 * @ligas/domain — Motor de competición.
 *
 * TypeScript puro: sin NestJS, sin Prisma, sin IO. Determinista y
 * exhaustivamente testeado. La API lo orquesta; el frontend lo reutiliza
 * para previews (wizard de torneo).
 */

export * from "./modality";
export * from "./round-robin";
export * from "./groups";
export * from "./knockout";
export * from "./standings";
export * from "./state-machine";
export * from "./stage-plan";
