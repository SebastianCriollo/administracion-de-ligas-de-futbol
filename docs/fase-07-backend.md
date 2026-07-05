# Fase 7 — Backend: Motor de Competición + Fundación de la API

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 8 (Frontend).

**Verificación real de esta fase**
- `@ligas/domain`: **34/34 tests** (Vitest) ✅ + typecheck ✅
- Migración inicial (`20260704200426_init`) aplicada contra **PostgreSQL 16 real** ✅
- Seed ejecutado y verificado por SQL: 8 equipos, 88 jugadores, 4 partidos, 4 árbitros ✅
- API NestJS booteada: `GET /api/v1/health` → `{"status":"ok"}` con query real a la BD ✅ y envelope de error verificado ✅

---

## 1. Decisiones respondidas en esta fase

### ¿Usamos Supabase?
**Sí, con roles delimitados:**
- **Supabase Storage** para archivos (escudos, fotos, actas PDF, galería) vía API S3-compatible — migrable a AWS S3 sin tocar código (decisión Fase 1 §10).
- **Supabase como PostgreSQL gestionado en producción** — Prisma se conecta por `DATABASE_URL`; en desarrollo usamos PostgreSQL local (esta fase migró y sembró contra Postgres 16 real).
- **NO usamos Supabase Auth ni su cliente de datos**: nuestro RBAC (roles por organización + guards de propiedad) exige lógica propia en NestJS con JWT. Supabase es infraestructura, no framework.

### Soporte multi-modalidad ⚽
**Sí — implementado en esta fase.** Nuevo enum `Modality` en `Tournament`:
`FUTBOL_11 · FUTBOL_9 · FUTBOL_8 · FUTBOL_7 · FUTBOL_6 · FUTBOL_5 · FUTSAL · BEACH_SOCCER`

`MODALITY_CONFIG` (en `@ligas/domain`) define por modalidad: **titulares exactos** (11/9/8/7/6/5), **mínimo legal** para no perder por W.O., duración y periodos (fútbol playa juega 3×12), y política de cambios (limitados en F11, libres en reducido). La validación de alineaciones ahora es por modalidad: el contrato acota el rango y el servicio valida el número exacto según el torneo. Cada torneo declara su modalidad — una misma organización puede correr un torneo de fútbol 11 y otro de indor simultáneamente.

## 2. `@ligas/domain` — el motor (TS puro, 0 dependencias)

| Módulo | Qué hace | Tests |
|---|---|---|
| `round-robin.ts` | Método del círculo: n par/impar (BYE), ida/vuelta espejada, localías equilibradas, determinista | 8 |
| `groups.ts` | Distribución serpiente (cabezas de serie separados) + RR por grupo | 2 |
| `knockout.ts` | Brackets con sembrado clásico (1 y 2 solo en la final), **byes para los mejores sembrados con propagación automática**, vínculos de progresión WINNER/LOSER, tercer puesto | 6 |
| `standings.ts` | Tabla con puntos configurables y desempates en cascada: POINTS→GD→GF→**H2H (mini-tabla del subgrupo empatado)**→FAIR_PLAY→DRAW (determinista y marcado `tiedByLot` para sorteo manual) | 8 |
| `state-machine.ts` | Transiciones válidas del partido; prórroga/penales; estados terminales | 4 |
| `stage-plan.ts` | Deriva etapas por formato (LEAGUE_PLAYOFFS → RR + llave de 4; GROUPS_KNOCKOUT → grupos + final con 3er puesto) y **cruce mundialista A1-B2/B1-A2** | 6 |
| `modality.ts` | Config de las 8 modalidades | — |

## 3. `apps/api` — fundación NestJS

- `main.ts` — prefijo `/api/v1`, CORS con credenciales, shutdown hooks.
- `config/env.ts` — entorno validado con Zod al bootear (falla rápido con mensaje claro).
- `infrastructure/prisma.service.ts` — PrismaClient con ciclo de vida Nest.
- `common/zod-validation.pipe.ts` — valida bodies/queries con los schemas de `@ligas/contracts` y responde el envelope `details[{path,message}]`.
- `common/http-exception.filter.ts` — envelope único para toda excepción (verificado con 404 y 500 reales).
- **Convención adoptada**: inyección explícita `@Inject(X)` — `tsx`/esbuild no emite `design:type` metadata; la inyección por tipo fallaba en runtime. Documentado en el código.

Los módulos de negocio se registran sobre esta fundación: auth (Fase 9), administrativos (Fase 10), deportivos (Fase 11) — como definía el roadmap.

## 4. Cambios al modelo de datos

- `Tournament.modality` (`Modality`, default `FUTBOL_11`) + espejo en `createTournamentSchema`.
- `submitLineupSchema`: titulares 4–11 en el contrato; número exacto validado en servicio contra `MODALITY_CONFIG`.
- Migración `init` generada y aplicada; seed verificado.

## 5. Entregable siguiente

**Fase 8 — Frontend**: `apps/web` (Next.js 15 + Tailwind 4 consumiendo `@ligas/ui`), shells de navegación (portal público, auth, app privada con sidebar por rol), theming claro/oscuro sin flash, y las primeras vistas renderizando datos reales de la API.
