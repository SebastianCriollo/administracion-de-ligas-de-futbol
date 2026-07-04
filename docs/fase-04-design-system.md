# Fase 4 — Design System

> Tokens de diseño, temas y librería de componentes `@ligas/ui`. Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 5 (Base de datos).

**Estado**: esta fase entrega **código real y verificado** (typecheck ✅). El monorepo Turborepo + pnpm queda operativo.

---

## 1. Qué se construyó

```
├── package.json / pnpm-workspace.yaml / turbo.json / .prettierrc / .gitignore
├── packages/
│   ├── config/                # tsconfigs compartidos (base, react-library)
│   └── ui/                    # @ligas/ui — el design system
│       ├── src/styles/tokens.css    # tokens: fuente de verdad (claro + oscuro)
│       ├── src/styles/theme.css     # puente Tailwind 4 (@theme inline)
│       ├── src/lib/cn.ts            # merge de clases (clsx + tailwind-merge)
│       └── src/components/          # 12 componentes base implementados
```

## 2. Decisiones de tokens

- **OKLCH** para todo color: percepción uniforme y contraste predecible entre temas.
- **Dos temas hechos a mano** (`:root` claro, `.dark` oscuro) — el oscuro no es una inversión; cada token se recalibró (patrón Vercel/Sofascore). Sin elección explícita, se respeta `prefers-color-scheme`.
- **Color de marca**: verde césped `oklch(0.55 0.14 155)` — identidad futbolística sin caer en verde neón; saturación contenida (tono Stripe/Linear).
- **Semánticos deportivos propios**: `warning` = tarjeta amarilla, `danger` = roja/derrota, `success` = victoria, `live` = rojo pulsante EN VIVO (convención Flashscore), `draw` = empate. Los componentes **solo** consumen tokens semánticos, nunca valores crudos.
- **Tipografía**: Inter (UI) + Geist Mono (marcadores, cronómetro, columnas numéricas de tablas — `tabular-nums`). Escala de 12 → 40 px con un token especial `--text-scoreboard`.
- **Motion**: 120/180/280 ms con easings custom; `prefers-reduced-motion` anula todas las duraciones a 0 desde los tokens (accesibilidad sin esfuerzo por componente).
- **Sombras suaves de 2 capas**, nunca duras; radios de 6→16 px (cards 12 px, patrón Linear).
- **Tailwind 4 CSS-first**: `theme.css` expone los tokens como utilidades (`bg-primary`, `text-live`, `shadow-md`) vía `@theme inline` — sin `tailwind.config.js`.

## 3. Librería de componentes — estado

### Implementados en esta fase (12) ✅

| Componente | Variantes / notas |
|---|---|
| `Button` | primary · secondary · outline · ghost · destructive · link; tamaños sm/md/lg/**touch** (48 px+, para el acta del árbitro) /icon; estado `loading` con spinner |
| `Badge` | neutral · primary · success · warning · danger · info · outline; opción `dot` (punto de estado, patrón Vercel) |
| `Card` | + Header/Title/Description/Content/Footer |
| `Input` | estado `invalid` accesible (aria-invalid) |
| `Textarea` | ídem |
| `Label` | opción `required` (asterisco) |
| `Alert` | 5 variantes semánticas + Title/Description, `role="alert"` |
| `Skeleton` | regla del sistema: skeletons, nunca spinners de página |
| `Avatar` | imagen → iniciales → placeholder (fallback en cascada); 5 tamaños |
| `Separator` | horizontal/vertical con aria |
| `Spinner` | solo dentro de botones/acciones puntuales |
| `LiveIndicator` | **componente de dominio**: punto rojo pulsante + minuto en mono (`67'`) |

### Especificados — se implementan cuando llega su consumidor (Fases 8–11)

| Componente | Base | Fase | Notas |
|---|---|---|---|
| `Modal` / `Drawer` / `BottomSheet` | Radix Dialog | 8 | BottomSheet = flujo de eventos del acta móvil |
| `Select` / `Combobox` | Radix | 8 | Combobox con búsqueda para jugadores/equipos |
| `DropdownMenu` / `Tooltip` / `Popover` | Radix | 8 | |
| `Tabs` | Radix | 8 | Ficha de partido, detalle de torneo |
| `DataTable` | TanStack Table | 8 | Orden, filtros, paginación, columnas numéricas mono |
| `Form` (Field/Message) | React Hook Form + Zod | 8 | Validación inline patrón Stripe |
| `Toast` | sonner | 8 | |
| `CommandPalette` (⌘K) | cmdk | 8 | Búsqueda global + acciones |
| `Sidebar` / `Topbar` / `Breadcrumbs` / `BottomNav` | propios | 8 | Shell de la app; BottomNav en móvil |
| `EmptyState` | propio | 8 | Ilustración + CTA (patrón Notion) |
| `Calendar` (mes/semana/agenda) | propio | 10 | Chips de partido, drag para reprogramar |
| `Chart` (wrappers Recharts) | Recharts | 10 | Con paleta de tokens y tooltips del sistema |
| **`MatchRow`** | propio | 11 | El componente más importante (Fase 2, decisión #1): estados programado/vivo/final/aplazado/W.O. |
| **`StandingsTable`** | DataTable | 11 | Zonas de clasificación/descenso, racha de forma |
| **`Bracket`** | propio (SVG) | 11 | Zoom/pan, export a imagen/PDF |
| **`EventTimeline`** | propio | 11 | Timeline de goles/tarjetas/cambios por minuto |
| **`PitchLineup`** | propio (SVG) | 11 | Campo con alineaciones drag & drop |
| **`StatBar`** | propio | 11 | Barras enfrentadas (posesión, tiros) estilo Sofascore |
| `ScoreBoard` / `MatchClock` | propios | 11 | Marcador `--text-scoreboard` + cronómetro mono |

Este orden es deliberado: los componentes de dominio se construyen junto a sus datos reales para no diseñar contra supuestos.

## 4. Reglas de la librería (vinculantes)

1. Componentes **solo** consumen tokens semánticos; prohibido `bg-green-500` o hex sueltos.
2. Todo componente expone `className` y lo mergea con `cn()` — extensible sin romper el sistema.
3. Variantes tipadas con **CVA**; los tipos de props se exportan siempre.
4. Accesibilidad por defecto: foco visible (`focus-visible:ring`), roles/aria correctos, contraste AA en ambos temas.
5. Server Components por defecto; `"use client"` solo donde hay estado (ej. `Avatar`).
6. Los interactivos complejos se construyen sobre **Radix** (no se reinventa el foco/teclado).

## 5. Cómo consumirá la app los estilos

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";
@import "@ligas/ui/styles/tokens.css";
@import "@ligas/ui/styles/theme.css";
```

El toggle de tema alterna la clase `dark`/`light` en `<html>` (persistida en cookie para SSR sin flash).

## 6. Verificación

- `pnpm install` ✅ — workspace resuelve `@ligas/ui` y `@ligas/config`.
- `pnpm typecheck` en `@ligas/ui` ✅ — strict, `noUncheckedIndexedAccess`.
- Render visual: se valida en la Fase 8 cuando exista `apps/web` (los componentes son JSX puro sin dependencias de runtime más allá de React).

## 7. Entregable siguiente

**Fase 5 — Base de datos**: diagrama ER completo (Mermaid), schema Prisma en `packages/database` con todas las entidades (organización, liga, temporada, torneo, etapa, grupo, jornada, partido, evento, equipo, jugador, árbitro, escenario, acta, auditoría…), relaciones, restricciones, índices y seeds de desarrollo.
