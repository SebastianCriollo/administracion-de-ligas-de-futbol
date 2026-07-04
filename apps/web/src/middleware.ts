import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección de rutas privadas: /app requiere sesión (cookie httpOnly del
 * refresh token — API y web comparten dominio). La validación real del
 * token la hace la API en cada request; esto solo evita renderizar el
 * shell privado a anónimos.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("refresh_token");

  if (req.nextUrl.pathname.startsWith("/app") && !hasSession) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  // Con sesión activa, /login y /registro redirigen al dashboard.
  if (["/login", "/registro"].includes(req.nextUrl.pathname) && hasSession) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/registro"],
};
