import { Card, CardContent } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear organización" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Crea tu organización</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Tu cuenta de administrador y tu organización, en un solo paso.
      </p>

      <Card className="mt-6">
        <CardContent>
          <RegisterForm />
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
