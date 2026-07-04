# Fase 3 — Diseño UX/UI

> Mapa de vistas, arquitectura de navegación, flujos por rol y wireframes de pantallas clave. Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 4 (Design System).

---

## 1. Arquitectura de navegación

Tres shells de interfaz, cada uno con su navegación propia:

```
┌─ PORTAL PÚBLICO (sin sesión) ──────────────────────────────┐
│  Navbar: [Logo org] Inicio · Torneos · Equipos · Noticias  │
│          · Calendario · [🌙] · [Iniciar sesión]            │
└────────────────────────────────────────────────────────────┘

┌─ AUTH (pantallas centradas, sin chrome) ───────────────────┐
│  Login · Registro · Recuperar · Restablecer · Invitación   │
└────────────────────────────────────────────────────────────┘

┌─ APP (dashboard privado) ──────────────────────────────────┐
│ Sidebar (por rol) │ Topbar: breadcrumbs · ⌘K · 🔔 · avatar │
│                   │ Contenido                              │
└────────────────────────────────────────────────────────────┘
```

**Sidebar por rol** (mismo shell, ítems filtrados por permiso):

| Sección | SUPER | ADMIN LIGA | ÁRBITRO | DT | JUGADOR |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Organizaciones | ✅ | — | — | — | — |
| Ligas / Torneos | ✅ | ✅ | 👁 | 👁 | 👁 |
| Equipos / Jugadores | ✅ | ✅ | 👁 | ✅ (el suyo) | 👁 |
| Árbitros | ✅ | ✅ | 👁 (perfil) | — | — |
| Escenarios | ✅ | ✅ | 👁 | 👁 | — |
| Partidos / Calendario | ✅ | ✅ | ✅ (designados) | ✅ (su equipo) | ✅ (los suyos) |
| Acta digital | — | 👁 | ✅ | — | — |
| Estadísticas | ✅ | ✅ | 👁 | ✅ (su equipo) | ✅ (propias) |
| Noticias / Galería | ✅ | ✅ | — | 👁 | 👁 |
| Reportes | ✅ | ✅ | — | — | — |
| Auditoría | ✅ | ✅ (su org) | — | — | — |
| Configuración | ✅ | ✅ | perfil | perfil | perfil |

✅ gestiona · 👁 solo lectura · — no visible

---

## 2. Inventario completo de vistas (46)

### Auth (5)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 1 | Login | `/login` | Email+password, Google, link recuperar |
| 2 | Registro | `/registro` | Datos básicos + creación de organización (flujo organizador) |
| 3 | Recuperar contraseña | `/recuperar` | Email → envío de link |
| 4 | Restablecer contraseña | `/restablecer/[token]` | Nueva contraseña + confirmación |
| 5 | Aceptar invitación | `/invitacion/[token]` | Onboarding de DT/árbitro/jugador invitado |

### Portal público (10)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 6 | Landing plataforma | `/` | Hero, features, organizaciones destacadas, CTA |
| 7 | Inicio de organización | `/[org]` | Partidos hoy/próximos, tablas resumidas, noticias |
| 8 | Torneos públicos | `/[org]/torneos` | Grid de torneos activos/finalizados |
| 9 | Detalle torneo público | `/[org]/torneos/[slug]` | Tabs: Tabla · Calendario · Resultados · Llaves · Estadísticas · Reglamento |
| 10 | Ficha de partido pública | `/[org]/partidos/[id]` | Marcador (vivo), timeline, alineaciones, stats |
| 11 | Perfil de equipo público | `/[org]/equipos/[slug]` | Plantilla, resultados, historia, patrocinadores |
| 12 | Perfil de jugador público | `/[org]/jugadores/[id]` | Stats, historial, tarjetas, transferencias |
| 13 | Noticias públicas | `/[org]/noticias` + `/[slug]` | Lista editorial + artículo |
| 14 | Calendario público | `/[org]/calendario` | Vista mensual/lista por torneo |
| 15 | Galería pública | `/[org]/galeria` | Fotos/videos por álbum |

### Dashboard y transversales (6)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 16 | Dashboard | `/app` | Por rol: KPIs, partidos hoy, próximos, clima, noticias, gráficos, accesos rápidos |
| 17 | Command palette | overlay ⌘K | Búsqueda global + acciones |
| 18 | Notificaciones | `/app/notificaciones` | Centro de notificaciones + preferencias |
| 19 | Perfil propio | `/app/perfil` | Datos, foto, contraseña, sesiones activas |
| 20 | Configuración organización | `/app/configuracion` | Branding, miembros/roles, integraciones |
| 21 | Auditoría | `/app/auditoria` | Tabla filtrable de acciones con diff |

### Gestión deportiva (17)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 22 | Ligas (lista) | `/app/ligas` | Cards con estado (activa/suspendida/finalizada), acciones |
| 23 | Detalle liga | `/app/ligas/[id]` | Temporadas, torneos, duplicar temporada |
| 24 | Torneos (lista) | `/app/torneos` | Filtros por liga/estado/formato |
| 25 | **Wizard crear torneo** | `/app/torneos/nuevo` | 6 pasos con preview (ver §4.2) |
| 26 | Detalle torneo (gestión) | `/app/torneos/[id]` | Tabs: Resumen · Equipos · Calendario · Tabla · Llaves · Estadísticas · Configuración |
| 27 | Equipos (lista) | `/app/equipos` | Grid con escudos, búsqueda |
| 28 | Detalle/edición equipo | `/app/equipos/[id]` | Tabs: Info · Plantilla · Uniformes · Staff · Patrocinadores · Historia |
| 29 | Jugadores (lista) | `/app/jugadores` | Tabla con foto, posición, equipo, filtros |
| 30 | Detalle/edición jugador | `/app/jugadores/[id]` | Tabs: Perfil · Estadísticas · Historial · Transferencias · Lesiones |
| 31 | Árbitros (lista) | `/app/arbitros` | Tabla: categoría, experiencia, calificación, disponibilidad |
| 32 | Detalle árbitro | `/app/arbitros/[id]` | Perfil, historial de partidos, calificaciones |
| 33 | Escenarios (lista) | `/app/escenarios` | Cards con foto, capacidad, estado |
| 34 | Detalle escenario | `/app/escenarios/[id]` | Info, mapa (Google Maps), fotos, partidos programados |
| 35 | Partidos (lista) | `/app/partidos` | MatchRows agrupados por fecha/torneo, filtros |
| 36 | Detalle partido (gestión) | `/app/partidos/[id]` | Programación, designación arbitral, cambio horario/cancha, alineaciones, acta |
| 37 | Calendario (gestión) | `/app/calendario` | Vistas: mes · semana · lista · agenda; drag para reprogramar |
| 38 | Tabla de posiciones (gestión) | `/app/torneos/[id]/tabla` | Tabla completa + fair play + reglas de desempate aplicadas |

### Operación de partido (3)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 39 | **Acta digital (árbitro)** | `/app/acta/[matchId]` | Móvil-primero: cronómetro, eventos ≤3 taps, penales, cierre (ver §4.3) |
| 40 | Convocatoria (DT) | `/app/mi-equipo/convocatoria/[matchId]` | Selección de convocados, respuesta de jugadores |
| 41 | Alineación (DT) | `/app/mi-equipo/alineacion/[matchId]` | Campo SVG drag & drop, titulares/suplentes, formación |

### Contenido y reportes (5)
| # | Vista | Ruta | Contenido clave |
|---|---|---|---|
| 42 | Noticias (gestión) | `/app/noticias` + editor | CRUD con editor rico, portada, publicación |
| 43 | Galería (gestión) | `/app/galeria` | Upload múltiple, álbumes, videos, documentos |
| 44 | Reglamentos | `/app/reglamentos` | PDFs por torneo, versiones |
| 45 | Estadísticas | `/app/estadisticas` | Goleadores, asistencias, vallas, tarjetas, rachas, equipos |
| 46 | Reportes | `/app/reportes` | Generador: entidad + filtros + formato (Excel/PDF/CSV) |

---

## 3. Flujos por rol (críticos)

### 3.1 Admin de liga — crear y publicar un torneo
```
Dashboard → Torneos → [+ Nuevo torneo]
 → Paso 1 Formato (liga | copa | grupos+eliminación | liga+playoffs | personalizado)
 → Paso 2 Reglas (puntos, desempates, ida/vuelta, prórroga/penales, clasificados)
 → Paso 3 Equipos (seleccionar/crear/invitar)
 → Paso 4 Calendario (fechas disponibles, canchas, restricciones)
 → Paso 5 PREVIEW generado por el motor (fixture/llaves) → regenerar/ajustar
 → Paso 6 Confirmar → torneo publicado en portal público
```

### 3.2 Árbitro — día de partido
```
Notificación de designación → confirma
Día del partido: Dashboard → "Tus partidos de hoy" → Abrir acta
 → Verifica alineaciones (enviadas por DTs) → Iniciar partido (cronómetro)
 → Registra eventos: [⚽ Gol] → jugador → confirmar (3 taps)
 → Descanso → 2T → (prórroga → penales si aplica)
 → Finalizar → resumen → incidencias/observaciones → CERRAR ACTA
 → Sistema: tabla + stats + notificaciones + acta PDF, automático
```

### 3.3 DT — semana de partido
```
Notificación "próximo partido" → Convocatoria → selecciona convocados
 → jugadores reciben push/email → confirman asistencia
 → día previo: Alineación → formación + titulares (campo SVG)
 → envía alineación → visible para árbitro y público al iniciar
```

### 3.4 Jugador / Público
```
Jugador: login → dashboard personal (próximo partido, convocatoria pendiente
 de responder, sus stats) → historial completo
Público: /[org] → torneo → tabla/calendario/ficha de partido en vivo, sin login
```

---

## 4. Wireframes de pantallas clave

### 4.1 Dashboard (admin de liga)
```
┌──────────┬──────────────────────────────────────────────────────┐
│ ◆ Liga X │  Dashboard                        ⌘K  ☀/🌙  🔔³  👤  │
│          ├──────────────────────────────────────────────────────┤
│ ▸ Dash   │  Hola, Sebastián            [🌤 24° Cuenca] [+ Crear]│
│ ▸ Torneos│                                                      │
│ ▸ Equipos│  ┌─────────┐┌─────────┐┌─────────┐┌─────────┐        │
│ ▸ Jugad. │  │ 4       ││ 32      ││ 486     ││ 12      │        │
│ ▸ Árbitr.│  │ Torneos ││ Equipos ││ Jugador.││ Árbitros│        │
│ ▸ Escen. │  │ activos ││ ▲ +3    ││ ▲ +24   ││         │        │
│ ▸ Partid.│  └─────────┘└─────────┘└─────────┘└─────────┘        │
│ ▸ Calend.│                                                      │
│ ▸ Stats  │  HOY · 3 partidos              PRÓXIMOS              │
│ ▸ Notic. │  ┌──────────────────────────┐  ┌───────────────────┐ │
│ ▸ Report.│  │ 19:00 Leones vs Águilas  │  │ Sáb · 8 partidos  │ │
│ ▸ Audit. │  │ 🔴 71' Tigres 2-1 Pumas  │  │ Dom · 6 partidos  │ │
│ ▸ Config.│  │ FIN   Osos  0-3 Halcones │  │ [ver calendario]  │ │
│          │  └──────────────────────────┘  └───────────────────┘ │
│          │  ┌ Goles por jornada (chart) ┐ ┌ Últimas noticias ┐  │
└──────────┴──────────────────────────────────────────────────────┘
```

### 4.2 Wizard de torneo — Paso 5 (preview)
```
┌ Nuevo torneo ── ①Formato ②Reglas ③Equipos ④Fechas ●⑤Preview ⑥Publicar ┐
│                                                                        │
│  Copa Ciudad 2026 · Grupos (2×4) + Semifinal + Final · 8 equipos       │
│                                                                        │
│  GRUPO A                    │  LLAVES (generadas)                      │
│  J1  Leones  vs Águilas     │   A1 ─┐                                  │
│  J1  Tigres  vs Pumas       │       ├─ SF1 ─┐                          │
│  J2  Leones  vs Tigres      │   B2 ─┘       ├─ 🏆 FINAL                │
│  J2  Águilas vs Pumas       │   B1 ─┐       │                          │
│  J3  ...                    │       ├─ SF2 ─┘   (+ 3er puesto)         │
│                             │   A2 ─┘                                  │
│                                                                        │
│  ⟳ Regenerar sorteo   ✎ Ajustar manualmente   [← Atrás]  [Continuar →] │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Acta digital del árbitro (móvil, en vivo)
```
┌─────────────────────────┐
│ 🔴 EN VIVO      ⏱ 67:23 │
│  LEONES   2 : 1  ÁGUILAS│
│  ─────── [⏸ Pausar] ────│
│                         │
│  ┌─────────┐ ┌─────────┐│
│  │ ⚽ GOL  │ │ 🟨 AMAR. ││
│  └─────────┘ └─────────┘│
│  ┌─────────┐ ┌─────────┐│
│  │ 🟥 ROJA │ │ ⇄ CAMBIO││
│  └─────────┘ └─────────┘│
│  ┌─────────────────────┐│
│  │ ✚ Incidencia / nota ││
│  └─────────────────────┘│
│  67' ⚽ #9 García (LEO)  │
│  54' 🟨 #4 Ríos (ÁGU)   │
│  23' ⚽ #9 García (LEO)  │
│                         │
│  [Descanso] [Finalizar] │
└─────────────────────────┘
Tap "⚽ GOL" → bottom sheet: equipo → jugador (grid con dorsales) →
  tipo (jugada/penal/tiro libre/autogol) + asistencia → ✓ Confirmar
```

### 4.4 Ficha de partido pública (anatomía Sofascore)
```
┌ sticky ────────────────────────────────────────────┐
│  Copa Ciudad · Semifinal · Estadio Norte           │
│   🛡 LEONES      2 : 1      ÁGUILAS 🛡    🔴 67'    │
│  [Resumen] [Alineaciones] [Estadísticas] [Tabla]   │
├────────────────────────────────────────────────────┤
│ Resumen:  67' ⚽ García ─────────────●              │
│           54' ●───────────── 🟨 Ríos               │
│           23' ⚽ García (asist. Peña) ●             │
│ Alineaciones: campo SVG vertical, 4-3-3 vs 4-4-2,  │
│   fotos/dorsales posicionados, suplentes, DT       │
│ Estadísticas: barras enfrentadas (posesión, tiros, │
│   faltas, córners) + jugador del partido ⭐        │
└────────────────────────────────────────────────────┘
```

### 4.5 Tabla de posiciones
```
│ #  Equipo         PJ  PG  PE  PP  GF  GC  DG  PTS   Forma      │
│ 1 🟢 🛡 Leones      10   8   1   1  24   8 +16  25   ✓✓✓✗✓      │
│ 2 🟢 🛡 Tigres      10   7   2   1  19   9 +10  23   ✓✓−✓✓      │
│ 3 🔵 🛡 Águilas     10   6   1   3  17  12  +5  19   ✗✓✓✓✗      │
│ ...                                                            │
│ 8 🔴 🛡 Osos        10   1   1   8   6  22 -16   4   ✗✗✗−✗      │
│  🟢 clasifica directo 🔵 playoff 🔴 desciende · Fair Play tab   │
```

**Otros wireframes definidos en componentes** (se materializan en Fase 4/8): bracket interactivo (zoom/pan/export), calendario mensual con chips de partido, perfil de jugador con radar de stats, generador de reportes en 3 pasos.

---

## 5. Principios de interacción (vinculantes)

1. **≤ 3 clics** para cualquier acción frecuente; 1 acción primaria visible por vista.
2. **Optimistic UI** en el acta digital (el árbitro nunca espera un spinner en cancha); cola offline si se pierde señal (PWA).
3. **Skeletons, nunca spinners de página completa**; transiciones 150–200 ms.
4. **Estados vacíos con CTA** en toda lista; **confirmación destructiva** con nombre escrito para eliminar liga/torneo.
5. **Responsive real**: sidebar → bottom-nav en móvil; tablas → cards; el acta digital se diseña móvil-primero y se adapta a desktop (no al revés).
6. **Accesibilidad AA**: foco visible, aria en componentes interactivos, contraste validado en ambos temas.

---

## 6. Entregable siguiente

**Fase 4 — Design System**: tokens (paleta clara/oscura, tipografía, espaciado, radios, sombras, motion), y la librería `packages/ui` con los ~25 componentes base (Button, Input, Card, Table, Modal, Badge, MatchRow, StandingsTable, Bracket, EventTimeline, PitchLineup, StatBar, Calendar, etc.) documentados con sus variantes y estados.
