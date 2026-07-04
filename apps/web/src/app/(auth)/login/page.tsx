import { Button, Card, CardContent, Input, Label, Separator } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Iniciar sesión" };

/**
 * UI de login. El submit se conecta en la Fase 9 (autenticación) —
 * los formularios pasan a React Hook Form + loginSchema de @ligas/contracts.
 */
export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Bienvenido de vuelta</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Ingresa a tu organización para continuar.
      </p>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" className="w-full">
            <GoogleIcon />
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-foreground-subtle">
            <Separator className="flex-1" /> o con tu correo <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@correo.com" autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/recuperar" className="text-xs text-primary hover:underline">
                ¿La olvidaste?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" />
          </div>
          <Button className="w-full">Iniciar sesión</Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-primary hover:underline">
          Crea tu organización
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
