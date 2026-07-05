# Fase 14 — Portal Público y Optimización

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 15 (Despliegue).

**Verificación real**
- Portal público **SSR sin login**: `/liga-master-cuenca` renderiza torneos y noticias; el torneo público muestra tabla completa y fixture; la noticia renderiza con `<title>` SEO propio; org inexistente → 404 ✅
- Títulos SEO por página: `Liga Apertura F7 · Liga Master Cuenca · Ligas` ✅
- **Rate limiting activo** (headers `X-RateLimit-*`: 120/min global, 10/min en `/auth`) ✅
- **Helmet**: HSTS, `nosniff`, `X-Frame-Options` verificados ✅
- Índices comprobados con EXPLAIN: `Match_organizationId_scheduledAt_idx` en uso (con datos de dev el planner elige seq scan por tamaño — comportamiento correcto) ✅
- **Regresión completa en verde**: 12/12 integración + 6/6 Playwright con el hardening activo ✅

---

## 1. API pública (`/public/:orgSlug`)

Controller `@Public()` que **solo expone contenido publicado**:

```
GET /public/:org                        resumen: org, torneos, partidos hoy, noticias
GET /public/:org/tournaments/:slug      tabla(s) + fixture + llaves (torneos publicados)
GET /public/:org/tournaments/:slug/scorers
GET /public/:org/news · /news/:slug
```

Selects mínimos (sin datos personales: ni documentos de jugadores, ni emails), torneos `DRAFT` invisibles, organización inactiva → 404.

## 2. Portal público en Next (ISR)

- **`lib/public-api.ts`** (`server-only`): fetch con `next: { revalidate: 60 }` — cada página pública se regenera como máximo cada 60 s. SEO + frescura, sin carga por visita (decisión Fase 1 §5).
- **`/[org]`** (#7): encabezado de la organización, partidos de hoy, grid de torneos con estado, noticias.
- **`/[org]/torneos/[slug]`** (#9): tablas por grupo con **racha de forma** (puntos verdes/grises/rojos), resultados por etapa/jornada con penales anotados.
- **`/[org]/noticias/[slug]`** (#13): artículo con autor y fecha.
- `generateMetadata` por página: título y descripción dinámicos para buscadores y compartidos.

## 3. Hardening

| Medida | Detalle |
|---|---|
| Rate limiting | `@nestjs/throttler` global (120 req/min/IP) + **10 req/min en `/auth`** (fuerza bruta); relajado en `NODE_ENV=test` |
| Headers | `helmet()` en `configureApp` — HSTS 1 año, nosniff, frameguard, etc. (aplica también en tests) |
| Portal | Sin auth pero sin datos sensibles por diseño de los selects |

## 4. Rendimiento

- Páginas públicas: First Load JS 103–116 kB, HTML completo en el servidor (contenido visible sin JavaScript).
- Consultas calientes cubiertas por los índices de la Fase 5 — verificado con `EXPLAIN` forzando `enable_seqscan=off` que el índice compuesto se usa; con volúmenes reales el planner lo elegirá solo.
- El dashboard admin agrega KPIs en un `Promise.all` (una ida a la BD por métrica, en paralelo).

## 5. Entregable siguiente

**Fase 15 — Despliegue (final)**: Dockerfiles de API y web, docker-compose de producción local, guía de despliegue (Vercel + Railway/Fly + Supabase), variables de entorno documentadas, README completo del proyecto y cierre del roadmap.
