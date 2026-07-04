import { Card, CardContent } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Te enviaremos un enlace para restablecerla.
      </p>

      <Card className="mt-6">
        <CardContent>
          <ForgotForm />
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
