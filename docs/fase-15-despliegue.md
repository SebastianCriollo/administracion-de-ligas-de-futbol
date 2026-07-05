# Fase 15 — Despliegue (cierre del roadmap)

> Versión 1.0 — fase final del plan de 15 fases acordado en la Fase 1.

**Verificación real**
- Bundle de producción de la API (`tsup`, workspace embebido, Prisma externo): **bootea y responde `/health` contra la BD** ✅
- Next `output: "standalone"`: server autocontenido bootea y sirve `/` y el portal público con 200 ✅
- Dockerfiles multi-stage para API y web + `docker-compose.yml` completo (db + api + web con healthchecks) ✅
- README del proyecto reescrito como documentación de entrada ✅

---

## 1. Artefactos de despliegue

| Artefacto | Descripción |
|---|---|
| `apps/api/Dockerfile` | Multi-stage: instala con pnpm filtrado, genera Prisma Client, bundle tsup; runtime alpine sin código fuente, usuario no-root, **`prisma migrate deploy` al arrancar** |
| `apps/web/Dockerfile` | Multi-stage con `NEXT_PUBLIC_API_URL` como build-arg; runtime = standalone de Next (solo `server.js` + estáticos), usuario no-root |
| `docker-compose.yml` | Postgres 16 con volumen + healthcheck, API y web encadenadas; secretos vía `.env` (`JWT_SECRET` obligatorio) |
| `.dockerignore` | Sin node_modules/builds/env en el contexto |
| `tsup.config.ts` | `noExternal: @ligas/*` (workspace embebido) + Prisma externo (CJS/engine nativo) |

## 2. Rutas de despliegue soportadas

### A. Gestionado (recomendado para empezar)
- **Web** → **Vercel** (detecta el monorepo; root `apps/web`; `NEXT_PUBLIC_API_URL` y `API_INTERNAL_URL` como env).
- **API** → **Railway / Fly.io** con `apps/api/Dockerfile`.
- **PostgreSQL** → **Supabase** (la `DATABASE_URL` del pooler en modo sesión para Prisma).
- **Storage** → Supabase Storage (S3-compatible, ya decidido en Fase 7).
- **Email** → Resend (`RESEND_API_KEY`).

### B. Self-hosting
`cp .env.example .env` (definir `JWT_SECRET`) → `docker compose up --build` → web en `:3000`, API en `:4000`, migraciones automáticas.

## 3. Variables de entorno (matriz completa)

| Variable | Servicio | Obligatoria | Descripción |
|---|---|:-:|---|
| `DATABASE_URL` | api | ✅ | PostgreSQL (Supabase: usar el pooler en session mode) |
| `JWT_SECRET` | api | ✅ | ≥ 32 caracteres |
| `CORS_ORIGIN` | api | ✅ | URL(s) del frontend, separadas por coma |
| `WEB_URL` | api | ✅ | Para links de emails (reset, invitaciones) |
| `PORT` | api | — | default 4000 |
| `JWT_ACCESS_TTL_SECONDS` / `JWT_REFRESH_TTL_DAYS` | api | — | 900 / 30 |
| `GOOGLE_CLIENT_ID` | api | — | habilita login con Google |
| `RESEND_API_KEY` / `MAIL_FROM` | api | — | sin key ⇒ email al log |
| `NEXT_PUBLIC_API_URL` | web (build) | ✅ | URL pública de la API para el navegador |
| `API_INTERNAL_URL` | web (runtime) | — | URL interna para SSR/ISR (en compose: `http://api:4000/api/v1`) |

**Producción**: API y web deben compartir sitio (subdominios con cookie `domain=.tudominio.com`, o mismo dominio tras proxy) para la cookie httpOnly del refresh token (nota de la Fase 9).

## 4. Estado final del roadmap

| # | Fase | Estado |
|---|---|---|
| 1–2 | Arquitectura · Benchmarking | ✅ |
| 3–4 | UX/UI (46 vistas) · Design System (tokens OKLCH + @ligas/ui) | ✅ |
| 5–6 | Base de datos (34 modelos) · Contratos Zod + API REST v1 | ✅ |
| 7 | Motor de competición (34 tests) + multi-modalidad + fundación NestJS | ✅ |
| 8–9 | Frontend (3 shells, theming SSR) · Auth completa con RBAC | ✅ |
| 10–11 | Admin (wizard→publish) · Deportivo (acta, recálculo, progresión) | ✅ |
| 12 | Reportes XLSX/PDF/CSV · acta oficial PDF · noticias · invitaciones | ✅ |
| 13 | Pruebas (34+12+6) + CI GitHub Actions | ✅ |
| 14 | Portal público ISR + hardening | ✅ |
| 15 | Despliegue | ✅ |

## 5. Backlog priorizado post-v1 (fuera del alcance acordado, listo para retomar)

1. **WebSockets** (minuto a minuto en vivo en el portal) — la arquitectura ya lo contempla (rooms `match:{id}`).
2. **Convocatorias/alineaciones de DT** en la web (la API y el modelo ya existen).
3. **Calendario visual** (mes/semana/agenda) y command palette ⌘K.
4. **Subida de archivos** (escudos, fotos, galería) con presigned URLs — contrato ya definido.
5. **Notificaciones push** (PWA) y recordatorios programados (BullMQ).
6. **Vistas por rol** de árbitro/DT/jugador en el shell (la matriz de la Fase 3 §1).
7. Swagger/OpenAPI generado, Sentry, backups automatizados.
