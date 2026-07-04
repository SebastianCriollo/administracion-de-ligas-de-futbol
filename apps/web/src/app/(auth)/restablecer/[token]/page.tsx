import { Card, CardContent } from "@ligas/ui";
import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Restablecer contraseña</h1>
      <p className="mt-1 text-sm text-foreground-muted">Elige tu nueva contraseña.</p>

      <Card className="mt-6">
        <CardContent>
          <ResetForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
