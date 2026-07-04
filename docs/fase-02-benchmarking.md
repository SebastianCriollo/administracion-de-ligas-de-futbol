# Fase 2 — Investigación y Benchmarking

> Análisis de plataformas de referencia y decisiones de producto/UX derivadas. Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 3 (Diseño UX/UI).

---

## 1. Metodología

Se analizaron los referentes en tres dimensiones:

1. **Gestión** (el back-office del organizador): FIFA Competition Management, LeagueApps, TeamSnap, Spond, Tournament Software.
2. **Consumo** (la experiencia del aficionado/jugador): Sofascore, Flashscore, OneFootball.
3. **Lenguaje visual SaaS** (cómo debe *sentirse* la interfaz): Linear, Stripe, Notion, Vercel, Apple.

Para cada referente: qué hace excepcionalmente bien, qué adoptamos y qué descartamos conscientemente.

---

## 2. Análisis por referente

### 2.1 Gestión de competiciones

#### FIFA Competition Management
- **Qué hace bien**: rigor del modelo de competición — separación estricta entre *competición → temporada → etapa → grupo → jornada → partido*; actas oficiales normalizadas; designaciones arbitrales como flujo de primera clase; trazabilidad total.
- **Adoptamos**: esa jerarquía exacta como columna vertebral de nuestro modelo de datos (ya reflejada en la arquitectura); el acta de partido como documento con ciclo de vida (borrador → en juego → cerrada → oficial) que congela el resultado; la designación arbitral con estados (propuesta → confirmada → rechazada).
- **Descartamos**: su UI densa y burocrática pensada para operadores entrenados. Nuestro público incluye ligas barriales.

#### LeagueApps
- **Qué hace bien**: onboarding del organizador — crear una liga funcional en minutos con asistentes paso a paso; multi-programa (varias competiciones simultáneas bajo una organización); portal público por organización con branding propio.
- **Adoptamos**: **wizard de creación de torneo** en pasos (formato → reglas → equipos → calendario generado → revisión → publicar) con previsualización antes de confirmar; el concepto de "sitio público por organización" (`/[org]/...`).
- **Descartamos**: su foco en pagos/registros comerciales (fuera de alcance v1) y su estética anticuada.

#### TeamSnap / Spond
- **Qué hacen bien**: la vida del equipo — disponibilidad y convocatoria con confirmación de asistencia, comunicación DT→plantilla, recordatorios automáticos de partido. Spond destaca en simplicidad móvil.
- **Adoptamos**: flujo de **convocatoria con respuesta del jugador** (convocado → confirma/rechaza), recordatorios automáticos (notificación N horas antes del partido), y la vista "mi próximo partido" como elemento central del dashboard de DT y jugador.
- **Descartamos**: chat de equipo completo (v2; en v1 basta notificaciones + tablón).

#### Tournament Software
- **Qué hace bien**: visualización de llaves (brackets) claras e imprimibles; soporta formatos complejos encadenados.
- **Adoptamos**: **bracket interactivo** como componente estrella (zoom/pan, responsive, exportable a imagen/PDF); el modelo de "etapas encadenadas" que ya definimos en `packages/domain` (la salida de una etapa alimenta la siguiente).
- **Descartamos**: su navegación confusa entre torneos.

### 2.2 Experiencia de consumo

#### Sofascore
- **Qué hace bien**: la **ficha de partido** perfecta — marcador grande, timeline de eventos con iconografía inequívoca (gol, tarjeta, cambio, penal), alineaciones sobre campo gráfico, estadísticas comparadas con barras enfrentadas; rating de jugadores.
- **Adoptamos**: su anatomía de ficha de partido completa (header pegajoso con marcador + tabs: resumen / alineaciones / estadísticas / tabla); timeline vertical de eventos por minuto; **campo de fútbol SVG con las alineaciones**; "jugador del partido".
- **Descartamos**: densidad publicitaria y sobrecarga de micro-stats que no capturamos (xG, heatmaps).

#### Flashscore
- **Qué hace bien**: densidad eficiente — decenas de partidos escaneables de un vistazo; convenciones de color universales (rojo = vivo, amarillo/rojo tarjetas); actualización en tiempo real sin recargar.
- **Adoptamos**: la **fila de partido** como componente canónico (hora/minuto en vivo · escudo+nombre local · marcador · visitante), reutilizada en dashboard, calendario, portal público y perfil de equipo; agrupación por torneo y por fecha; indicador "EN VIVO" pulsante.
- **Descartamos**: densidad extrema tipo tabla de los 2000s — la suavizamos con las tarjetas y espaciado del lenguaje Linear/Stripe.

#### OneFootball
- **Qué hace bien**: jerarquía editorial — noticias con imágenes grandes integradas junto a resultados; navegación "sigue a tu equipo"; dark mode excelente.
- **Adoptamos**: el módulo de noticias con tarjetas de imagen prominente; personalización del dashboard por rol ("mi equipo" primero para DT/jugador); dark mode como ciudadano de primera clase, no un filtro invertido.

### 2.3 Lenguaje visual SaaS

| Referente | Qué tomamos |
|---|---|
| **Linear** | Sidebar compacta con iconos + labels, command palette (⌘K) para navegación/búsqueda global, transiciones de 150–200 ms, densidad "cómoda pero seria". |
| **Stripe** | Tablas de datos impecables (alineación numérica, filas hover, acciones contextuales), formularios con validación inline elegante, documentación visual de estados vacíos. |
| **Notion** | Estados vacíos con ilustración + CTA claro ("Aún no hay equipos — crea el primero"), edición inline donde tenga sentido. |
| **Vercel** | Tema oscuro de alto contraste, tipografía Geist/Inter, badges de estado con punto de color, layout con mucho aire. |
| **Apple** | Restraint: una acción primaria por vista, jerarquía tipográfica fuerte, animaciones con propósito (nunca decorativas). |

---

## 3. Matriz de funcionalidades (síntesis competitiva)

| Capacidad | FIFA CM | LeagueApps | TeamSnap/Spond | T. Software | Sofascore/Flash | **Nosotros v1** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Formatos múltiples de torneo | ✅ | ⚠️ | ❌ | ✅ | — | ✅ |
| Generación automática de fixture/llaves | ✅ | ✅ | ❌ | ✅ | — | ✅ |
| Acta digital de árbitro en vivo | ✅ | ❌ | ❌ | ❌ | — | ✅ |
| Convocatorias con confirmación | ❌ | ⚠️ | ✅ | ❌ | — | ✅ |
| Portal público con branding por organización | ❌ | ✅ | ❌ | ⚠️ | — | ✅ |
| Ficha de partido con timeline en vivo | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Estadísticas ricas (goleadores, vallas, rachas) | ⚠️ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-torneo simultáneo por organización | ✅ | ✅ | ❌ | ✅ | — | ✅ |
| Dark mode premium | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Reportes Excel/PDF/CSV + acta oficial PDF | ✅ | ⚠️ | ❌ | ⚠️ | — | ✅ |

**Lectura estratégica**: ningún referente combina *gestión seria de competiciones* (FIFA CM) con *experiencia de consumo premium* (Sofascore) y *simplicidad de onboarding* (LeagueApps). Esa intersección es exactamente nuestro producto.

---

## 4. Decisiones de producto derivadas (vinculantes para Fase 3)

1. **La fila de partido (MatchRow) es el componente más importante del sistema** — aparece en 10+ vistas. Se diseña primero y con estados: programado, en vivo (minuto + pulso), finalizado, aplazado, W.O.
2. **Wizard de creación de torneo en 6 pasos** con preview del calendario/llaves generados antes de publicar (patrón LeagueApps + nuestro motor de dominio).
3. **Ficha de partido con anatomía Sofascore**: header sticky con marcador, tabs (Resumen · Alineaciones · Estadísticas · Tabla), timeline de eventos, campo SVG.
4. **Acta digital del árbitro = vista móvil-primero**: el árbitro la usa de pie, en la cancha, con el pulgar. Botones grandes, flujo de registro de evento en ≤ 3 taps (evento → jugador → confirmar), cronómetro siempre visible.
5. **Dashboard por rol**: mismo shell, contenido distinto — admin ve KPIs y partidos de hoy; DT ve su próximo partido y convocatoria pendiente; jugador ve sus stats y su próximo partido; árbitro ve sus designaciones.
6. **Command palette (⌘K)** para búsqueda global (equipos, jugadores, partidos, acciones) — patrón Linear.
7. **Bracket interactivo** con zoom/pan y export a imagen/PDF — patrón Tournament Software elevado.
8. **Estados vacíos diseñados** en todas las listas (patrón Notion) — críticos en el onboarding de una organización nueva.
9. **Convocatoria con confirmación del jugador** y recordatorios automáticos (patrón Spond).
10. **Portal público por organización** con branding (logo + color primario configurable) y SEO (patrón LeagueApps + nuestra decisión ISR de Fase 1).

## 5. Anti-decisiones (qué NO haremos y por qué)

- **No** pagos/inscripciones con cobro (LeagueApps core) — v2; enorme superficie legal/regional.
- **No** chat en tiempo real entre miembros — v2; las notificaciones cubren el caso crítico.
- **No** métricas avanzadas tipo xG/heatmaps (Sofascore) — requieren datos de tracking que una liga amateur no genera.
- **No** apps nativas en v1 — la web responsive + PWA (instalable, push) cubre el uso móvil, incluida el acta del árbitro.
- **No** densidad Flashscore extrema ni burocracia FIFA CM — el punto medio es nuestro tono: *serio pero liviano*.

---

## 6. Entregable siguiente

**Fase 3 — Diseño UX/UI**: mapa completo de +40 vistas con su contenido y componentes, flujos por rol (admin crea torneo, árbitro levanta acta, DT convoca, jugador consulta), y wireframes de las pantallas clave (dashboard, wizard de torneo, ficha de partido, acta digital, tabla de posiciones, bracket).
