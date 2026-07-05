# Fase 9 — Autenticación y RBAC

> Versión 1.0 — pendiente de aprobación antes de iniciar la Fase 10 (Módulos administrativos).

**Verificación real**
- API probada por HTTP: registro → login → `/me` → **rotación de refresh** → **detección de reuso (revoca la familia completa)** → credenciales malas → forgot-password ✅
- **E2E en navegador (Chromium)**: registro por formulario → aterriza en `/app`; `/login` con sesión redirige a `/app`; `/app` sin sesión → 307 a `/login?next=/app` ✅
- `next build` + typecheck de API y web ✅

---

## 1. Backend (`apps/api/src/auth/`)

| Pieza | Diseño |
|---|---|
| **Registro** | Usuario + organización + membresía `LEAGUE_ADMIN` en una transacción; slug de organización con resolución de colisiones |
| **Password** | Argon2id; verificación en tiempo constante y respuesta idéntica exista o no el usuario (anti-enumeración, también en forgot-password) |
| **Access token** | JWT 15 min con payload tipado de `@ligas/contracts`: `{sub, email, globalRole, orgs: {orgId: roles[]}}` — los guards deciden sin tocar la BD |
| **Refresh token** | Aleatorio de 48 bytes, guardado **hasheado** (SHA-256), cookie httpOnly `SameSite=Lax`, 30 días; **rotación en cada uso** |
| **Detección de robo** | Si llega un refresh ya rotado ⇒ se revocan TODAS las sesiones del usuario (verificado por HTTP) |
| **Google OAuth** | `POST /auth/google` verifica el ID token (`google-auth-library`), crea o enlaza cuenta por `googleId`/email; activo al configurar `GOOGLE_CLIENT_ID` |
| **Recuperación** | Token de 1 uso/1 hora (nuevo modelo `PasswordResetToken` + migración); al restablecer se cierran todas las sesiones; email vía `MailService` (log en dev, Resend en Fase 12) |
| **Invitaciones** | `POST /auth/invitations/accept` activa la cuenta y **enlaza el perfil** (Player/Referee/TeamStaff) según la invitación |

## 2. Autorización

- **Guard global** (`APP_GUARD`): todo endpoint exige Bearer token salvo `@Public()`.
- **`@Roles("LEAGUE_ADMIN", …)`**: valida el rol del usuario **dentro de la organización de la ruta** (`:orgId`) contra el claim `orgs` del token. `SUPER_ADMIN` global siempre pasa.
- **`@CurrentUser()`**: inyecta el payload tipado.
- Los guards de **propiedad** (árbitro designado, DT de su equipo) llegan con sus módulos en las Fases 10-11, como definió la Fase 6 §4.

## 3. Frontend

- **Formularios reales** (login, registro, recuperar, restablecer) con React Hook Form + `zodResolver` usando los **mismos schemas** de `@ligas/contracts` que valida la API — validación inline y errores del servidor en `Alert`.
- **`lib/api.ts`**: access token **solo en memoria** (nunca localStorage); la cookie httpOnly viaja con `credentials: "include"`; al recargar se recupera sesión vía `/auth/refresh`.
- **Middleware de Next**: `/app/*` sin cookie de sesión → redirect a `/login?next=…`; `/login`/`/registro` con sesión → redirect a `/app`. La validación fuerte del token la hace siempre la API.
- Nueva vista `/restablecer/[token]` (vista #4 del inventario).

## 4. Notas de producción

- En producción API y web deben compartir sitio (`app.dominio.com` + `api.dominio.com` con `domain=.dominio.com` en la cookie) o servirse tras el mismo proxy.
- `JWT_SECRET` obligatorio ≥ 32 chars; cookie `secure` activada fuera de desarrollo.
- Rate limiting de `/auth/*` llega en la Fase 14 (optimización/seguridad transversal).

## 5. Entregable siguiente

**Fase 10 — Módulos administrativos**: CRUD completo con auditoría para ligas/temporadas (+ duplicar), torneos (wizard + **preview del fixture con el motor** + publicar), equipos, jugadores, árbitros y escenarios; interceptor de auditoría; y las vistas de gestión conectadas consumiendo la API real.
