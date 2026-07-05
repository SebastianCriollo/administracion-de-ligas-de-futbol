/**
 * @ligas/contracts — contratos compartidos frontend ⇄ backend.
 *
 * Cada schema Zod es la ÚNICA fuente de validación: la API los usa en
 * pipes (NestJS) y el frontend en React Hook Form. Los tipos se infieren,
 * nunca se duplican a mano.
 */

export * from "./common";
export * from "./auth";
export * from "./organizations";
export * from "./competitions";
export * from "./teams";
export * from "./players";
export * from "./referees-venues";
export * from "./matches";
export * from "./content";
export * from "./stats-reports";
