# Fase 1 — Arquitectura General

**Plataforma SaaS de Gestión de Ligas, Torneos y Campeonatos de Fútbol**

> Documento de arquitectura. Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 2 (Investigación y Benchmarking).

---

## 1. Visión del producto

Una plataforma multi-tenant donde cualquier organización (liga barrial, federación, empresa, club) puede crear y administrar competiciones de fútbol de cualquier formato — liga, copa, grupos + eliminación, liga + playoffs, hexagonales, cuadrangulares y formatos personalizados — con generación automática de calendarios, llaves y clasificaciones, estadísticas en tiempo real y un portal público de consulta con calidad visual comparable a Sofascore / OneFootball.

### Principios rectores

1. **Multi-tenant desde el día uno**: cada organización opera aislada (datos, usuarios, branding), sobre una sola base de datos con aislamiento por `organizationId` (row-level).
2. **El motor de competición es el corazón**: la generación de fixtures, llaves y tablas es un módulo de dominio puro, sin dependencias de framework, 100 % testeable.
3. **Portal público SEO-first**: resultados, tablas y estadísticas consultables sin login, renderizados en servidor.
4. **Diseño premium**: sistema de diseño propio (tokens + componentes) inspirado en Linear/Stripe/Sofascore, con modo claro/oscuro nativo.
5. **Auditable y seguro**: toda mutación queda registrada (quién, qué, cuándo, valor anterior/nuevo).

---

## 2. Stack tecnológico (decisión)

| Capa | Tecnología | Justificación |
|---|---|---|
| Monorepo | **Turborepo + pnpm** | Compartir tipos, validaciones y design system entre apps; builds incrementales. |
| Frontend | **Next.js 15 (App Router) + React 19 + TypeScript** | SSR/ISR para el portal público (SEO), Server Components para dashboards con mucha data. |
| Estilos / UI | **TailwindCSS 4 + shadcn/ui + Framer Motion** | Base accesible (Radix), personalizable al 100 %, animaciones y microinteracciones. |
| Gráficos | **Recharts** | Charts del dashboard y estadísticas. |
| Estado servidor | **TanStack Query** | Cache, revalidación, optimistic updates (ej. minuto a minuto del partido). |
| Formularios | **React Hook Form + Zod** | Validación compartida frontend/backend vía paquete común. |
| Backend | **NestJS 11 + TypeScript** | Arquitectura modular, DI, guards/interceptors para RBAC y auditoría, ecosistema maduro. |
| ORM / BD | **Prisma + PostgreSQL 16** | Esquema tipado, migraciones versionadas, integridad referencial fuerte. |
| Cache / colas | **Redis + BullMQ** | Notificaciones, generación de reportes pesados, emails, recálculos. |
| Tiempo real | **WebSockets (Socket.IO via Nest Gateway)** | Marcador en vivo, cronómetro, eventos del partido. |
| Autenticación | **JWT (access + refresh rotativo) + Google OAuth 2.0** | Sesiones seguras; login social. |
| Almacenamiento | **S3-compatible (Supabase Storage / AWS S3)** | Escudos, fotos, actas PDF, galería, reglamentos. |
| Mapas | **Google Maps API** | Ubicación de escenarios deportivos. |
| Email | **Resend (o SES)** | Transaccional: invitaciones, convocatorias, recuperación. |
| Reportes | **exceljs / pdfmake / csv** | Exportaciones Excel, PDF (actas oficiales) y CSV. |
| Testing | **Vitest (unit) + Supertest (API) + Playwright (E2E)** | Cobertura del motor de competición como prioridad. |
| CI/CD | **GitHub Actions** | Lint, typecheck, tests, migraciones, deploy. |
| Despliegue | **Vercel (web) + Railway/Fly.io (API + Postgres + Redis)** | Camino simple a producción; portable a Docker/K8s. |

---

## 3. Estructura del monorepo

```
administracion-de-ligas-de-futbol/
├── apps/
│   ├── web/                  # Next.js — dashboard admin + portal público
│   └── api/                  # NestJS — API REST + WebSockets
├── packages/
│   ├── ui/                   # Design System: componentes, tokens, temas
│   ├── domain/               # Motor de competición (TS puro, sin frameworks)
│   ├── contracts/            # Schemas Zod + tipos compartidos (DTOs)
│   ├── database/             # Schema Prisma, migraciones, seeds
│   └── config/               # ESLint, TS, Tailwind presets compartidos
├── docs/                     # Documentación por fase (este documento)
├── turbo.json
└── pnpm-workspace.yaml
```

### `packages/domain` — el motor de competición

Módulo de dominio puro (sin NestJS, sin Prisma) que implementa:

- **Generadores de fixture**: round-robin (ida / ida y vuelta), fase de grupos, eliminación directa (con byes y sembrado), liga + playoffs, formatos personalizados componibles (etapas encadenadas).
- **Motor de clasificación**: cálculo de PJ/PG/PE/PP/GF/GC/DG/PTS + Fair Play, con reglas de desempate configurables por torneo (puntos → DG → GF → enfrentamiento directo → fair play → sorteo).
- **Motor de progresión**: quiénes clasifican, cruces de llaves, tercer puesto, ascensos/descensos.
- **Máquina de estados del partido**: `SCHEDULED → LIVE → HT → 2T → ET → PENALTIES → FINISHED → (POSTPONED/CANCELLED/WALKOVER)`.

Esto permite testear exhaustivamente la lógica más crítica sin infraestructura, y reutilizarla en API y en previews del frontend (ej. simular llaves antes de confirmarlas).

---

## 4. Arquitectura del backend (NestJS)

Arquitectura modular limpia, un módulo Nest por contexto de negocio:

```
apps/api/src/
├── modules/
│   ├── auth/            # JWT, refresh, OAuth Google, recuperación
│   ├── organizations/   # Tenants, membresías, configuración
│   ├── users/           # Perfiles, roles por organización
│   ├── leagues/         # Ligas, temporadas, duplicar temporada
│   ├── tournaments/     # Torneos, formatos, etapas, reglas
│   ├── teams/           # Equipos, uniformes, staff, patrocinadores
│   ├── players/         # Jugadores, transferencias, lesiones
│   ├── referees/        # Árbitros, designaciones, calificaciones
│   ├── venues/          # Escenarios, fotos, geolocalización
│   ├── matches/         # Programación, alineaciones, eventos, actas
│   ├── standings/       # Tablas (proyección del motor de dominio)
│   ├── stats/           # Goleadores, asistencias, vallas, rachas
│   ├── news/            # Noticias / CMS ligero
│   ├── media/           # Galería, documentos, reglamentos (S3)
│   ├── notifications/   # Email, push, in-app (BullMQ)
│   ├── reports/         # Excel / PDF / CSV
│   └── audit/           # Log de auditoría (interceptor global)
├── common/              # Guards (RBAC), decorators, filters, pipes
└── infrastructure/      # Prisma, Redis, S3, mail, websockets
```

**Patrones clave**

- **Controller → Service → Repository**: controllers delgados; validación con Zod pipes desde `packages/contracts`; servicios orquestan y delegan la lógica de competición a `packages/domain`.
- **RBAC declarativo**: decorator `@Roles('LEAGUE_ADMIN', ...)` + guard que resuelve el rol del usuario *dentro de la organización/torneo/equipo* correspondiente (los roles son por contexto, no globales — salvo `SUPER_ADMIN`).
- **Auditoría por interceptor**: toda mutación registra actor, entidad, acción, diff y metadata (IP, user-agent) de forma transparente.
- **Eventos de dominio**: `MatchFinished` → recalcular tabla → actualizar stats → disparar notificaciones. Desacoplado vía event emitter + colas.
- **API REST versionada** (`/api/v1`) + documentación OpenAPI/Swagger generada.

---

## 5. Arquitectura del frontend (Next.js)

Dos experiencias en una app, separadas por route groups:

```
apps/web/src/app/
├── (public)/            # Portal público — SSR/ISR, sin login
│   ├── page.tsx                       # Landing / inicio
│   └── [org]/                         # Portal por organización
│       ├── torneos/[slug]/            # Tabla, calendario, resultados
│       ├── partidos/[id]/             # Ficha del partido (live)
│       ├── equipos/[slug]/            # Perfil de equipo
│       ├── jugadores/[id]/            # Perfil de jugador
│       └── noticias/
├── (auth)/              # Login, registro, recuperar contraseña
└── (app)/               # Dashboard privado — por rol
    ├── dashboard/
    ├── ligas/ · torneos/ · equipos/ · jugadores/ · arbitros/
    ├── escenarios/ · partidos/ · calendario/ · estadisticas/
    ├── noticias/ · galeria/ · reportes/ · auditoria/
    └── configuracion/ · perfil/
```

- **Server Components + ISR** para todo lo público (tablas, resultados) → SEO y velocidad.
- **Client components + TanStack Query + WebSocket** para lo vivo (acta digital del árbitro, marcador en vivo, cronómetro).
- **Middleware de Next** para protección de rutas por rol + redirecciones por tenant.
- La UI por rol se resuelve con el mismo shell: la navegación y las acciones visibles se derivan de los permisos (un DT ve solo su equipo; un árbitro ve sus designaciones y el acta digital).

---

## 6. Modelo de roles (RBAC)

| Rol | Ámbito | Capacidades principales |
|---|---|---|
| `SUPER_ADMIN` | Plataforma | Todo: organizaciones, usuarios, configuración global, auditoría global. |
| `LEAGUE_ADMIN` | Organización | CRUD de ligas, torneos, equipos, jugadores, árbitros, escenarios, noticias, reportes. |
| `REFEREE` | Partidos designados | Acta digital: resultados, goles, tarjetas, incidencias, cierre de acta. |
| `TEAM_MANAGER` (DT) | Su(s) equipo(s) | Plantilla, convocatorias, alineaciones, calendario y estadísticas del equipo. |
| `PLAYER` | Su perfil | Consulta: sus estadísticas, partidos, historial, tarjetas, goles, asistencias. |
| Público | — | Consulta de toda la información publicada, sin sesión. |

Un mismo usuario puede tener roles distintos en organizaciones distintas (tabla `Membership(userId, organizationId, role, scope)`), y un DT puede ser jugador en otro torneo. El detalle fino de permisos se especifica en la Fase 5 (base de datos) y Fase 9 (autenticación).

---

## 7. Flujos críticos de negocio

1. **Crear torneo** → elegir formato (plantillas: liga, copa, grupos+eliminación, liga+playoffs, hexagonal, cuadrangular, personalizado) → configurar reglas (puntos, desempates, ida/vuelta, nº clasificados, prórroga/penales) → inscribir equipos → **el motor genera calendario y llaves automáticamente** → revisar/ajustar → publicar.
2. **Día de partido** → árbitro abre el acta digital → alineaciones confirmadas por los DT → inicio (cronómetro) → registra goles/tarjetas/cambios/incidencias en vivo → penales/prórroga si aplica → cierra acta → **tabla, llaves, estadísticas y notificaciones se actualizan automáticamente** → acta PDF oficial disponible.
3. **Fin de temporada** → cierre del torneo → ascensos/descensos aplicados → "duplicar temporada" clona estructura y reinicia estadísticas.

---

## 8. Requisitos no funcionales

- **Seguridad**: hashing Argon2, refresh tokens rotativos con revocación, rate limiting, CORS estricto, validación de entrada en borde (Zod), CSP, protección de subida de archivos (tipo/tamaño/antivirus opcional), RLS lógico por tenant en cada query.
- **Rendimiento**: ISR + cache Redis para tablas/stats públicas; índices cubiertos para las consultas calientes (tabla de posiciones, goleadores); paginación por cursor.
- **Escalabilidad**: API stateless (escala horizontal), trabajos pesados en colas, WebSockets con adapter Redis.
- **Observabilidad**: logs estructurados (pino), Sentry, health checks, métricas.
- **Accesibilidad**: WCAG 2.1 AA (base Radix), navegación por teclado, contraste verificado en ambos temas.
- **i18n-ready**: strings centralizados (es-ES por defecto), formatos de fecha/número por locale.

---

## 9. Roadmap de fases (plan de trabajo acordado)

| # | Fase | Entregable | Estado |
|---|---|---|---|
| 1 | Arquitectura general | Este documento | ✅ Entregado — **pendiente aprobación** |
| 2 | Investigación y benchmarking | Análisis de referentes (Sofascore, OneFootball, LeagueApps…), decisiones UX derivadas | ⏳ |
| 3 | Diseño UX/UI | Mapa de +40 vistas, wireframes/mockups de pantallas clave, flujos por rol | ⏳ |
| 4 | Design System | Tokens (color, tipografía, espaciado, sombras), tema claro/oscuro, librería `packages/ui` | ⏳ |
| 5 | Base de datos | Diagrama ER completo, schema Prisma, relaciones, índices, restricciones, seeds | ⏳ |
| 6 | API | Contratos OpenAPI, DTOs Zod en `packages/contracts` | ⏳ |
| 7 | Backend | Módulos NestJS + motor de competición (`packages/domain`) con tests | ⏳ |
| 8 | Frontend | Scaffolding Next.js, layouts, navegación, portal público | ⏳ |
| 9 | Autenticación | JWT + refresh + Google OAuth + RBAC + recuperación de contraseña | ⏳ |
| 10 | Módulos administrativos | Ligas, torneos, equipos, jugadores, árbitros, escenarios | ⏳ |
| 11 | Módulos deportivos | Partidos, acta digital en vivo, tablas, estadísticas, calendario | ⏳ |
| 12 | Reportes | Excel / PDF / CSV, acta oficial PDF, auditoría | ⏳ |
| 13 | Pruebas | Unit (motor), integración (API), E2E (Playwright) | ⏳ |
| 14 | Optimización | Performance, cache, SEO, accesibilidad | ⏳ |
| 15 | Despliegue | CI/CD, entornos, documentación de operación | ⏳ |

Cada fase termina con un entregable en `docs/` y/o código en el monorepo, commiteado en la rama de trabajo, y se detiene hasta recibir aprobación.

---

## 10. Decisiones que asumo (puedes vetarlas)

1. **REST versionada** en lugar de GraphQL — más simple de cachear, documentar y consumir desde el portal público. GraphQL no aporta suficiente aquí.
2. **Una sola app Next.js** para portal público + dashboard (route groups) en lugar de dos apps — comparte design system y sesión; se puede dividir después si el equipo crece.
3. **Multi-tenant por fila** (`organizationId`) en lugar de esquema-por-tenant — operación y migraciones muchísimo más simples al inicio; el aislamiento se refuerza a nivel de guard + repositorio.
4. **Español como idioma base** de la UI, con arquitectura i18n-ready.
5. **Supabase Storage** como almacenamiento inicial (API S3-compatible) — migrable a AWS S3 sin cambiar código.
