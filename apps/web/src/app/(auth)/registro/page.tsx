import { Button, Card, CardContent, Input, Label } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Crear organización" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Crea tu organización</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Tu cuenta de administrador y tu organización, en un solo paso.
      </p>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName" required>
                Nombre
              </Label>
              <Input id="firstName" autoComplete="given-name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName" required>
                Apellido
              </Label>
              <Input id="lastName" autoComplete="family-name" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required>
              Correo electrónico
            </Label>
            <Input id="email" type="email" placeholder="tu@correo.com" autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationName" required>
              Nombre de la organización
            </Label>
            <Input id="organizationName" placeholder="Liga Barrial San José" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" required>
              Contraseña
            </Label>
            <Input id="password" type="password" autoComplete="new-password" />
            <p className="text-xs text-foreground-subtle">
              Mínimo 10 caracteres, con mayúscula, minúscula y número.
            </p>
          </div>
          <Button className="w-full">Crear organización</Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
