# Fase 8 — Frontend: Fundación de `apps/web`

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 9 (Autenticación).

**Verificación real**
- `next build` ✅ (typecheck incluido) — 6 rutas, First Load JS compartido 102 kB
- Servidor de producción booteado; `/`, `/login`, `/app` responden 200 con SSR ✅
- **Screenshots reales tomados con Chromium** en claro y oscuro (enviados al chat) ✅

---

## 1. Qué se construyó

```
apps/web/src/
├── app/
│   ├── layout.tsx          # tema desde cookie en SSR (cero flash), Inter + Geist Mono
│   ├── globals.css         # Tailwind 4 + tokens del design system (@source escanea @ligas/ui)
│   ├── (public)/           # shell portal público
│   │   ├── layout.tsx      #   navbar sticky con blur + footer
│   │   └── page.tsx        #   landing: hero, 6 features, modalidades (desde MODALITY_CONFIG)
│   ├── (auth)/             # shell auth centrado
│   │   ├── login/          #   con botón Google (UI)
│   │   ├── registro/       #   usuario + organización en un paso
│   │   └── recuperar/
│   └── app/                # shell privado
│       ├── layout.tsx      #   Sidebar + Topbar
│       └── page.tsx        #   dashboard: KPIs, partidos de hoy, accesos rápidos
└── components/
    ├── theme-toggle.tsx    # alterna clase en <html> + cookie (SSR la lee)
    ├── sidebar.tsx         # navegación completa con estado activo
    └── topbar.tsx          # búsqueda (placeholder ⌘K), notificaciones, avatar
```

## 2. Decisiones técnicas

1. **Tema sin flash (FOUC)**: la cookie `theme` se lee en el RootLayout (Server Component) y la clase `dark`/`light` sale estampada en el HTML del servidor. El toggle solo toca `document.documentElement` + cookie — sin contexto de React, sin `useEffect`, sin parpadeo.
2. **Tailwind 4 CSS-first funcionando entre paquetes**: `@source "../../packages/ui/src"` hace que las clases usadas dentro de `@ligas/ui` se generen en el CSS de la app — el design system no necesita build propio.
3. **La landing consume `@ligas/domain`**: la sección de modalidades se renderiza desde `MODALITY_CONFIG` — el catálogo real del motor, no texto duplicado.
4. **Server Components por defecto**: solo `theme-toggle` y `sidebar` (usa `usePathname`) son client components. First Load JS: 102 kB compartido.
5. **Datos demo señalizados**: el dashboard muestra datos estáticos documentados como tal; en la Fase 10 el page consume `GET /orgs/{orgId}/dashboard` sin cambiar el layout. Los formularios de auth se conectan en la Fase 9 con React Hook Form + schemas de `@ligas/contracts`.

## 3. Estado de las vistas (del inventario de 46, Fase 3)

| Vista | Estado |
|---|---|
| Landing (#6) | ✅ completa |
| Login / Registro / Recuperar (#1–3) | ✅ UI completa; submit en Fase 9 |
| Dashboard (#16) | ✅ layout final; datos reales en Fase 10 |
| Shell privado (sidebar/topbar) | ✅ |
| Resto (torneos, equipos, partidos…) | Fases 10–11, sobre este shell |

## 4. Entregable siguiente

**Fase 9 — Autenticación**: módulo `auth` en la API (registro con organización, login con Argon2, JWT access + refresh rotativo en cookie httpOnly, Google OAuth, recuperación, invitaciones), guards RBAC + decorator `@Roles`, middleware de Next para proteger `/app`, y conexión real de los formularios de auth.
