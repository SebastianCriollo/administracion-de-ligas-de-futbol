# Fase 11 — Módulos Deportivos

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 12 (Reportes y notificaciones).

**Verificación real**
- **Temporada completa simulada por HTTP** (15 partidos de "Liga Apertura F7"): transiciones de estado → eventos → cierre de acta en cada partido; tabla recalculada con fair play; **semifinales sembradas automáticamente 1º-4º / 2º-3º al cerrar la última acta**; **final propagada por los ganadores** (con penales cuando hubo empate); campeón definido. Acta cerrada rechaza eventos con 409. ✅
- **E2E móvil en navegador (390×844)**: árbitro inicia partido → gol + amarilla en ≤3 taps → finaliza → **cierra acta desde el teléfono** → la tabla del grupo aparece recalculada en el detalle del torneo. Screenshots enviados. ✅

---

## 1. `MatchesService` — el corazón operativo

| Capacidad | Diseño |
|---|---|
| Transiciones | Máquina de estados de `@ligas/domain`; transición inválida ⇒ 409; `FINISH` materializa el marcador (un 0-0 sin eventos queda 0-0, no null — bug detectado y corregido en la simulación) |
| Eventos en vivo | Válidos solo en estados de juego; equipo debe jugar el partido; **el marcador es proyección de los eventos** (goles, autogoles, penales de tanda) — borrar un evento re-sincroniza |
| Designación arbitral | Upsert por rol (árbitro principal, asistentes, 4º) con ciclo PROPOSED→CONFIRMED |
| Permiso de operación | `LEAGUE_ADMIN` o **árbitro designado** (perfil enlazado por invitación) — guard de propiedad, no solo de rol |
| W.O. | Marcador reglamentario 3-0 y disparo inmediato de recálculos |
| **Cierre de acta** | `CLOSED` congela el resultado y dispara en cadena: ➊ recálculo de tabla ➋ propagación de llaves ➌ siembra de etapa siguiente |

## 2. Recálculo y progresión automática (reglas de negocio de la Fase 1)

- **Tabla**: `computeStandings` del motor con la config del torneo (puntos, desempates en cascada) + **fair play acumulado de los eventos** (amarilla 1, doble amarilla 3, roja 4). Siempre reconstruible: se recalcula desde todos los partidos cerrados de la etapa/grupo.
- **Propagación de llaves**: al cerrar un partido de eliminación, los partidos que lo referencian (`homeSourceMatchId` + `WINNER/LOSER`) reciben a su participante — la final y el tercer puesto se rellenan solos. Ganador por marcador o penales; empate sin penales no propaga (válido en liga).
- **Siembra entre etapas**: cuando la última acta de una etapa RR/GRUPOS se cierra, la primera ronda de la etapa KNOCKOUT siguiente se siembra sola: **1º-4º / 2º-3º** (liga+playoffs, orden de sembrado clásico) o **cruce mundialista A1-B2 / B1-A2** (grupos).
- **Stats**: goleadores (autogol no cuenta) y tarjetas agregados desde `MatchEvent`.

## 3. Frontend

- **Partidos** (#35): agrupados por torneo, fila de partido canónica (hora/EN VIVO/Final · equipos · marcador mono), refetch 20 s, cada fila abre su acta.
- **Acta digital** (#39) — **móvil-primero como se diseñó en Fase 3 §4.3**: marcador grande, botones `touch` (56 px) según el estado (Iniciar/Descanso/Reanudar/Penales/Finalizar/Cerrar acta), registro en ≤3 taps (minuto → tipo → equipo o jugador con dorsal), tanda de penales con sus propios eventos, timeline en vivo y candado visual al cerrar.
- **Estadísticas** (#45): goleadores y tarjetas por torneo con selector.

## 4. Hallazgos corregidos durante la verificación

1. **Marcador null en 0-0 sin eventos** → `FINISH` ahora sincroniza siempre.
2. **Unique compuesto con `groupId` null** → recálculo por `updateMany`.
3. **Rotación de refresh vs. carreras legítimas**: una navegación que aborta el `Set-Cookie` (o multi-tab) disparaba la detección de robo y bloqueaba la sesión. Se añadió la **ventana de gracia de 15 s** estándar: reuso inmediato = carrera, reuso tardío = robo (revoca la familia).

## 5. Qué queda para fases siguientes (según roadmap)

Convocatorias/alineaciones de DT y calendario visual (siguen el mismo patrón ya montado), portal público ISR, WebSockets para el minuto a minuto, notificaciones. Entran en Fases 12–14 junto a reportes y optimización.

## 6. Entregable siguiente

**Fase 12 — Reportes y contenido**: exportaciones Excel/PDF/CSV (tabla, calendario, goleadores), **acta oficial en PDF**, noticias con editor, y el envío real de emails (Resend) para invitaciones y recordatorios.
