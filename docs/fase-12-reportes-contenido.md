# Fase 12 — Reportes, Contenido e Invitaciones

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 13 (Pruebas).

**Verificación real (por HTTP, contra los datos vivos de los torneos jugados)**
- `tabla.csv` → CSV UTF-8 **con BOM** (Excel abre tildes bien) · `tabla.xlsx` → "Microsoft Excel 2007+" real · `tabla.pdf` → "PDF document v1.3" real ✅
- Calendario XLSX y goleadores generados ✅
- **Acta oficial en PDF** de un partido cerrado: marcador, eventos con minuto, cuerpo arbitral, observaciones, cierre firmado y líneas de firma ✅
- Noticia creada y publicada con slug (`real-cuenca-es-el-campeon-del-apertura-f7`) ✅
- Invitación de árbitro creada; **email con link de activación** registrado por el MailService ✅
- Typecheck API + `next build` ✅

---

## 1. Motor de exportación (`modules/reports`)

- **`exporters.ts`** — una sola definición de tabla (`Table`), tres salidas:
  - **CSV**: escaping correcto, BOM UTF-8 (el detalle que hace que Excel en español no rompa tildes).
  - **XLSX** (exceljs): título, subtítulo con timestamp, encabezado con estilo, columnas numéricas alineadas.
  - **PDF** (pdfkit): fuentes estándar embebidas (sin archivos de fuentes en el servidor), paginación automática.
- **Reportes disponibles**: tabla de posiciones (con fair play), calendario/resultados y goleadores — cada uno en los 3 formatos vía `?format=`.
- **Acta oficial PDF** (`/reports/match/:id/acta`): documento con membrete del torneo, marcador (con penales), timeline de eventos, cuerpo arbitral con estado de designación, observaciones/incidencias del acta, sello de cierre (quién y cuándo) y líneas de firma.
- **Decisión**: generación síncrona (los volúmenes de una liga no justifican colas); la interfaz HTTP no cambia si en el futuro se mueve a BullMQ.

## 2. Noticias (`modules/news`)

CRUD con ciclo `DRAFT → PUBLISHED → ARCHIVED`; `publishedAt` se sella al publicar por primera vez; autor tomado del token. Lo publicado será lo único visible en el portal público (Fase 14).

## 3. Invitaciones con email real

- `POST /orgs/:orgId/invitations`: crea la invitación (token hasheado, expira en 7 días, con vínculo opcional a equipo/jugador/árbitro) y **envía el correo** con el link de activación.
- **MailService → Resend** por HTTP API (sin SDK): con `RESEND_API_KEY` envía de verdad; sin ella, loguea (dev). El correo jamás tumba la operación de negocio.
- Vista `/invitacion/[token]` (#5 del inventario): el invitado completa nombre y contraseña, y entra directo a su organización con el rol y perfil enlazados (flujo de la Fase 9).

## 4. Frontend

- **Reportes** (#46): selector de torneo + grid de reportes × formatos con descarga autenticada (`downloadFile`: fetch con Bearer → blob → guardado).
- **Noticias** (#42): composición con borrador/publicar, lista con estado, publicar/archivar/eliminar.
- **Acta digital**: botón "Descargar acta oficial (PDF)" cuando el acta está cerrada.

## 5. Entregable siguiente

**Fase 13 — Pruebas**: suite de integración de la API (Supertest contra Postgres real: auth, RBAC, wizard→publish, ciclo de partido→recálculo→progresión), E2E formalizados con Playwright (los flujos que hoy corren como scripts), y cobertura del motor ampliada. CI con GitHub Actions ejecutándolo todo.
