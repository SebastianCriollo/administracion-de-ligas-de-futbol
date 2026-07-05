# Fase 10 — Módulos Administrativos

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 11 (Módulos deportivos).

**Verificación real**
- Por HTTP: liga → temporada → 8 equipos → **preview del motor** → **publish de GROUPS_KNOCKOUT** (12 partidos de grupos + semis + final + 3er puesto), standings inicializados con distribución serpiente, final con `WINNER/WINNER` y 3er puesto con `LOSER/LOSER` enlazados, **auditoría transparente** (13 registros), dashboard con KPIs reales, **403 en organización ajena** ✅
- **E2E en navegador**: login → dashboard real → wizard 4 pasos (Liga+Playoffs, Fútbol 7, 6 equipos con creación rápida) → preview → **publicar** → detalle con tabla y fixture (screenshots enviados) ✅
- Typecheck API + `next build` ✅

---

## 1. Backend — 6 controllers nuevos sobre la fundación de la Fase 9

| Módulo | Endpoints | Notas de negocio |
|---|---|---|
| `organizations` | dashboard (KPIs + partidos hoy), auditoría filtrable | KPIs en un solo `Promise.all` |
| `leagues` | CRUD + temporadas + **duplicar temporada** | Duplicado copia fichas vigentes, historial intacto |
| `tournaments` | CRUD + **preview** + **publish** + standings | Ver §2 |
| `teams` | CRUD + staff | `DELETE` desactiva — la historia deportiva es intocable |
| `players` | CRUD + alta en plantilla + **transferencias** | Dorsal único vigente por equipo; transferencia cierra ficha y abre otra, transaccional |
| `directory` | árbitros + escenarios | CRUDs de directorio |

**Auditoría por interceptor global** (`APP_INTERCEPTOR`): toda mutación autenticada registra actor, entidad (derivada del controller), acción por método HTTP, payload y metadata — fire-and-forget, nunca rompe la respuesta. Verificado: los CREATE de equipos/torneos aparecen en `GET /orgs/{id}/audit` sin que ningún servicio escriba código de auditoría.

## 2. Publicación de torneos (el corazón de la fase)

`FixtureService` traduce el payload del wizard al plan de etapas del motor; `preview` lo ejecuta **sin persistir** y `publish` lo persiste **transaccionalmente**:

- **ROUND_ROBIN** → jornadas + partidos con localías equilibradas.
- **GROUPS** → grupos (serpiente), asignación de `groupId` a inscripciones, jornadas compartidas, partidos por grupo y **standings por grupo**.
- **KNOCKOUT** → partidos ronda por ronda resolviendo los ids de los partidos fuente (`homeSourceMatchId` + `homeSourceTake`), byes omitidos (ya propagados por el motor), tercer puesto colgado de las semifinales con `LOSER`.
- Etapas posteriores (playoffs) se crean con equipos `null` — se rellenan al cerrar la etapa anterior (Fase 11).

**Corrección de modelo detectada al implementar**: la final y el 3er puesto referencian los mismos partidos de semifinal, así que `homeSourceMatchId` no podía ser `@unique`; se migró a relación N:1 + enum `SourceTake { WINNER, LOSER }` (migración `bracket_sources`).

## 3. Frontend — primeras vistas de gestión reales

- **`SessionProvider`**: bootstrap del shell privado — recupera el access token vía `/auth/refresh` (cookie httpOnly), carga `/auth/me`, expone `{me, orgId, orgName, logout}` y monta TanStack Query.
- **Dashboard** (#16): KPIs y partidos de hoy desde `GET /dashboard`, refetch cada 30 s, skeletons y estado vacío.
- **Torneos** (#24): grid con estado/formato/conteos + estado vacío con CTA.
- **Wizard** (#25): 4 pasos — formato + modalidad (catálogo real de `MODALITY_CONFIG`), selección de equipos con **creación rápida inline**, preview renderizado del motor con regenerar, publicar. Auto-crea liga/temporada en organizaciones nuevas.
- **Detalle de torneo** (#26): tabla(s) de posiciones por grupo y fixture completo por etapa/jornada, con "Por definir" en llaves futuras.
- **Equipos** (#27): registro + grid con plantilla contada.

## 4. Entregable siguiente

**Fase 11 — Módulos deportivos**: partidos (programación + designaciones), **acta digital del árbitro** (transiciones + eventos en vivo), cierre de acta que dispara recálculo de tabla + **progresión automática de llaves** (los "Por definir" se rellenan solos), estadísticas (goleadores, tarjetas, vallas) y calendario.
