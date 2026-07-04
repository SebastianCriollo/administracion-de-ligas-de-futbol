import { Button, Card, CardContent, Input, Label } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Te enviaremos un enlace para restablecerla.
      </p>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@correo.com" autoComplete="email" />
          </div>
          <Button className="w-full">Enviar enlace</Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        <Link href="/login" className="text-primary hover:underline">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
