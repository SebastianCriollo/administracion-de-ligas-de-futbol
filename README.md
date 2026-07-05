# ⚽ Ligas — Plataforma SaaS de Gestión de Torneos de Fútbol

Plataforma multi-tenant para administrar **ligas, copas y campeonatos de fútbol en todas sus modalidades** (fútbol 11/9/8/7/6/5, futsal y playa): fixtures y llaves generados automáticamente, acta digital del árbitro en la cancha, tablas y estadísticas en tiempo real, y un portal público con SEO para cada organización.

## Stack

**Monorepo** Turborepo + pnpm · **Web** Next.js 15, React 19, Tailwind 4, design system propio · **API** NestJS 11, Prisma, PostgreSQL 16 · **Auth** JWT + refresh rotativo + Google OAuth · **Tests** Vitest, Supertest, Playwright · **CI** GitHub Actions

```
apps/
  web/        Next.js — portal público (ISR) + dashboard admin + acta digital
  api/        NestJS — REST v1, RBAC por organización, auditoría
packages/
  domain/     Motor de competición (TS puro, 34 tests): round-robin, grupos,
              brackets con byes, clasificación con desempates, progresión
  database/   Schema Prisma (34 modelos) + migraciones + seed
  contracts/  Schemas Zod compartidos web ⇄ api
  ui/         Design system: tokens OKLCH claro/oscuro + componentes
  config/     tsconfigs compartidos
docs/         Documentación por fase (arquitectura → despliegue)
```

## Desarrollo local

Requisitos: Node 22, pnpm 10, PostgreSQL 16.

```bash
pnpm install

# Base de datos
cp packages/database/.env.example packages/database/.env   # DATABASE_URL
pnpm --filter @ligas/database migrate:dev
pnpm --filter @ligas/database seed                          # org demo

# API (:4000) y Web (:3000)
cp apps/api/.env.example apps/api/.env
pnpm --filter @ligas/api dev
pnpm --filter @ligas/web dev
```

Regístrate en `http://localhost:3000/registro` — el registro crea tu organización con rol de administrador.

## Tests

```bash
pnpm typecheck                        # 6 paquetes, strict
pnpm --filter @ligas/domain test      # motor de competición (34)
pnpm --filter @ligas/api test         # integración vs Postgres real (12)
pnpm --filter @ligas/web exec playwright test   # E2E navegador (6)
```

## Producción

**Self-hosting**: `cp .env.example .env` (define `JWT_SECRET`) y `docker compose up --build`.

**Gestionado**: web en Vercel, API en Railway/Fly (Dockerfile incluido), PostgreSQL y Storage en Supabase, email con Resend. Guía completa y matriz de variables en [`docs/fase-15-despliegue.md`](docs/fase-15-despliegue.md).

## Documentación

El proyecto se construyó en 15 fases documentadas en [`docs/`](docs/): arquitectura, benchmarking, UX (46 vistas), design system, modelo de datos (ER), API, motor de competición, frontend, autenticación, módulos administrativos y deportivos, reportes, pruebas, portal público y despliegue.
