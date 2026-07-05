# Fase 13 — Pruebas y CI

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 14 (Optimización).

**Estado de la pirámide de pruebas (todo en verde localmente)**
- Unit (motor `@ligas/domain`): **34 tests** ✅
- Integración de API (Vitest + Supertest contra **PostgreSQL real**): **12 tests** ✅
- E2E de navegador (Playwright + Chromium): **6 tests** ✅
- Typecheck estricto en los 6 paquetes ✅
- Pipeline de CI en GitHub Actions ejecutándolo todo ✅

---

## 1. Integración de API (`apps/api/test/`)

**Infraestructura**: `configureApp()` extraído de `main.ts` (misma configuración en test y producción); base `ligas_test` con las **migraciones reales** aplicadas en `globalSetup`; `TRUNCATE CASCADE` entre suites; sin paralelismo de archivos (BD compartida).

**`auth.test.ts`** — registro (usuario+org+rol), login con cookie httpOnly, 401 idéntico para contraseña mala y usuario inexistente (anti-enumeración), **rotación de refresh y revocación de familia en reuso tardío** (retro-datando la revocación más allá de la ventana de gracia), 401 sin token y **403 con token válido contra organización ajena**.

**`competition.test.ts`** — el ciclo de vida completo:
1. Preview genera fixture sin escribir en la BD.
2. Rechaza equipos de otra organización (400).
3. Publica LEAGUE_PLAYOFFS: 6 partidos de fase regular + 3 llaves sin equipos + standings en cero.
4. Doble publish → 409; eliminar publicado → 409.
5. **Fase regular completa con resultados deterministas** → tabla exacta (Equipo 1 con 9 pts y forma "WWW") → **semifinales sembradas 1º-4º / 2º-3º**.
6. **Semifinal empatada resuelta por penales** → la final recibe a los dos ganadores correctos.
7. Acta cerrada rechaza eventos y transiciones inválidas → 409.
8. Reportes: CSV empieza con BOM, PDF con `%PDF`, XLSX con `PK`.

**Bug real cazado por la suite**: un equipo que fallaba todos sus penales quedaba con `null` en vez de `0` (`count || null`), y la final no se propagaba. Corregido: los penales existen (aunque sean 0) solo si hubo tanda.

## 2. E2E formalizados (`apps/web/e2e/`)

Los scripts ad-hoc de las fases anteriores ahora son specs versionados:

- `auth.spec.ts` — registro→dashboard con nombre de organización visible, error inline con credenciales malas, redirect de ruta privada con `?next=`, validación de contraseña en cliente sin navegar.
- `tournament.spec.ts` — **el flujo estrella completo**: registro → wizard → crear 4 equipos inline → preview del motor (fase regular + playoffs visibles) → publicar → detalle con tabla, fixture y llaves "Por definir". Y estados vacíos del dashboard en organizaciones nuevas.

**`playwright.config.ts`**: `webServer` doble (levanta API y web y espera sus health checks; reutiliza servidores locales), Chromium del sistema si existe, screenshots solo en fallo, 1 worker (BD compartida), retry en CI.

## 3. CI (`.github/workflows/ci.yml`)

Un job con PostgreSQL 16 como service container:
`install → typecheck (6 paquetes) → tests del motor → migrate deploy → integración API → build web → E2E Playwright → artefactos de evidencia si falla`.

## 4. Entregable siguiente

**Fase 14 — Optimización y portal público**: portal público ISR (`/[org]/…` con tabla, calendario, ficha de partido y noticias sin login — el SEO de la Fase 1), rate limiting y headers de seguridad, índices verificados con EXPLAIN sobre las consultas calientes, y auditoría de accesibilidad/performance con Lighthouse.
