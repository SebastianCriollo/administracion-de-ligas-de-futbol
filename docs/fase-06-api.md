# Fase 6 — API

> Contratos compartidos (`packages/contracts`, Zod) y diseño de la API REST v1. Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 7 (Backend).

**Verificación**: typecheck de `@ligas/contracts` ✅ (Zod 4, strict). El OpenAPI/Swagger se genera automáticamente desde los controllers en la Fase 7.

---

## 1. Convenciones globales

| Aspecto | Convención |
|---|---|
| Base | `/api/v1` (REST versionada, decisión Fase 1 §10) |
| Auth | `Authorization: Bearer <accessToken>` (15 min) + refresh rotativo en cookie httpOnly |
| Tenancy | Rutas admin bajo `/orgs/{orgId}/…` — el guard verifica la membresía y el rol; rutas públicas bajo `/public/{orgSlug}/…` sin auth, solo datos publicados |
| Validación | Todos los bodies/queries pasan por los schemas de `@ligas/contracts` en un `ZodValidationPipe`; error 400 con `details[{path,message}]` |
| Errores | Envelope único `{statusCode, error, message, details?}` (RFC 9457 simplificado) |
| Paginación | Cursor: `?cursor=&limit=` → `{items, nextCursor, total?}` |
| Fechas | ISO 8601 UTC; la zona horaria de la organización solo formatea en el cliente |
| Mutaciones | Auditadas por interceptor (Fase 1 §4); `Idempotency-Key` opcional en generación de fixture y reportes |
| Tiempo real | WebSocket `/ws` — rooms por `match:{id}` (marcador/eventos) y `user:{id}` (notificaciones) |

## 2. El wizard como contrato

`createTournamentSchema` captura el wizard completo de la Fase 3 en un solo payload validado: formato, reglas de puntos, **tiebreakers ordenados** (`["POINTS","GD","GF","H2H","FAIR_PLAY","DRAW"]`), etapas explícitas para `CUSTOM`, equipos y restricciones de programación (días, hora inicial, canchas). El endpoint de preview ejecuta el motor de dominio **sin persistir**; publicar persiste el resultado aceptado.

Otras validaciones de negocio viven en el contrato, no en el controller: alineación con exactamente 11 titulares y dorsales únicos, cambio con jugador que entra y sale, evento con equipo obligatorio salvo incidencias.

## 3. Mapa de endpoints

### Auth — `/auth`
```
POST   /auth/register            registro organizador (usuario + organización)
POST   /auth/login               email + password → tokens
POST   /auth/google              OAuth code → tokens (crea usuario si no existe)
POST   /auth/refresh             rota refresh token
POST   /auth/logout              revoca refresh token
POST   /auth/forgot-password     envía email con token
POST   /auth/reset-password      restablece con token
POST   /auth/invitations/accept  activa cuenta invitada (DT/árbitro/jugador)
GET    /auth/me                  perfil + membresías
```

### Organización — `/orgs/{orgId}` *(LEAGUE_ADMIN salvo indicación)*
```
GET/PATCH  /                      configuración y branding
GET        /members               miembros y roles
POST       /invitations           invitar miembro con rol
DELETE     /members/{userId}/roles/{role}
GET        /dashboard             KPIs del dashboard (partidos hoy, totales, gráficos)
GET        /audit                 auditoría filtrable (auditQuerySchema)
```

### Competición — `/orgs/{orgId}/…`
```
GET/POST           /leagues                        CRUD ligas
GET/PATCH/DELETE   /leagues/{id}                   (+ suspender/finalizar vía status)
POST               /leagues/{id}/seasons           crear temporada
POST               /leagues/{id}/seasons/duplicate duplicar temporada (clona estructura)
GET/POST           /tournaments                    listar (filtros) / crear (wizard)
POST               /tournaments/preview            ⚡ motor genera fixture/llaves SIN persistir
GET/PATCH/DELETE   /tournaments/{id}
POST               /tournaments/{id}/publish       publica torneo + fixture aceptado
POST               /tournaments/{id}/regenerate    re-sortea (solo DRAFT)
GET                /tournaments/{id}/standings     tabla(s) por etapa/grupo
GET                /tournaments/{id}/bracket       llaves con progresión
GET                /tournaments/{id}/stats/…       scorers|assists|cards|clean-sheets|streaks
```

### Equipos y personas — `/orgs/{orgId}/…`
```
GET/POST         /teams                    CRUD equipos
GET/PATCH/DELETE /teams/{id}
POST             /teams/{id}/staff         DT/staff (+ invitación si trae email)
POST             /teams/{id}/sponsors
GET              /teams/{id}/roster        plantilla vigente + histórico
GET/POST         /players                  CRUD jugadores (filtros playerQuerySchema)
GET/PATCH        /players/{id}
POST             /players/{id}/roster      alta en plantilla (equipo/temporada/dorsal)
POST             /players/{id}/transfers   transferencia entre equipos
POST             /players/{id}/injuries
GET/POST         /referees                 CRUD árbitros
GET/PATCH        /referees/{id}
GET/POST         /venues                   CRUD escenarios
GET/PATCH        /venues/{id}              (+ fotos vía media)
```

### Partidos — `/orgs/{orgId}/matches`
```
GET      /                          filtros: torneo, equipo, árbitro, estado, rango
GET      /{id}                      detalle completo (eventos, alineaciones, acta)
PATCH    /{id}/schedule             programar / reprogramar (notifica cambios)
POST     /{id}/officials            designar árbitro          [ADMIN]
PATCH    /{id}/officials/{oid}      confirmar/rechazar        [REFEREE dueño]
POST     /{id}/officials/{oid}/rate calificar desempeño       [ADMIN]
POST     /{id}/callups              convocar jugadores        [TEAM_MANAGER]
PATCH    /{id}/callups/response     confirmar asistencia      [PLAYER]
PUT      /{id}/lineups              enviar alineación         [TEAM_MANAGER]
POST     /{id}/transitions          START/HALF_TIME/…/FINISH  [REFEREE designado]
POST     /{id}/events               registrar evento en vivo  [REFEREE designado]
DELETE   /{id}/events/{eventId}     corregir (audita)         [REFEREE designado]
POST     /{id}/report/close         cerrar acta → recálculos  [REFEREE designado]
POST     /{id}/report/officialize   validar acta              [ADMIN]
```

### Contenido — `/orgs/{orgId}/…`
```
GET/POST/PATCH/DELETE  /news, /albums, /documents
POST                   /media/presign      presigned URL de subida directa a S3
POST                   /media/assets       registra asset subido
```

### Notificaciones y reportes
```
GET    /me/notifications            centro de notificaciones (+ readAt)
PATCH  /me/notifications/{id}/read
PATCH  /me/notification-preferences
POST   /orgs/{orgId}/reports        genera export (cola BullMQ) → jobId
GET    /orgs/{orgId}/reports/{jobId} estado + URL de descarga
```

### Portal público — `/public/{orgSlug}` *(sin auth, ISR-friendly, solo publicado)*
```
GET /                               resumen (partidos hoy, tablas, noticias)
GET /tournaments                    torneos publicados
GET /tournaments/{slug}             detalle + tabla + fixture + llaves
GET /tournaments/{slug}/standings|schedule|bracket|stats
GET /matches/{id}                   ficha de partido (live: complementa WS)
GET /teams/{slug} · /players/{id}   perfiles públicos
GET /news · /news/{slug} · /albums  contenido publicado
```

## 4. Matriz de permisos por endpoint (extracto crítico)

| Acción | SUPER | ADMIN | REFEREE | DT | PLAYER |
|---|:-:|:-:|:-:|:-:|:-:|
| Crear/editar torneos, equipos, personas | ✅ | ✅ | — | — | — |
| Designar árbitros / oficializar actas | ✅ | ✅ | — | — | — |
| Transiciones + eventos + cerrar acta | — | — | ✅ *solo designado* | — | — |
| Convocar / enviar alineación | — | — | — | ✅ *solo su equipo* | — |
| Responder convocatoria | — | — | — | — | ✅ *solo la suya* |
| Lectura completa del tenant | ✅ | ✅ | 👁 | 👁 | 👁 |

Los "solo X" son **guards de propiedad**, no solo de rol: `REFEREE` debe estar designado y confirmado en ese partido; `TEAM_MANAGER` debe ser staff del equipo del partido. Se implementan como decorators en la Fase 7.

## 5. Eventos WebSocket

```
match:{id}    → match.transition  { status, minute }
              → match.event       { event }          (gol, tarjeta, cambio…)
              → match.score       { homeScore, awayScore }
user:{id}     → notification.new  { notification }
```
El portal público consume los mismos rooms en modo solo-lectura.

## 6. Entregable siguiente

**Fase 7 — Backend**: `packages/domain` (motor de competición con tests exhaustivos: round-robin, grupos, llaves con byes, clasificación con desempates) y `apps/api` (NestJS con los módulos, guards RBAC + propiedad, interceptor de auditoría, Prisma, y migración + seed contra PostgreSQL real).
