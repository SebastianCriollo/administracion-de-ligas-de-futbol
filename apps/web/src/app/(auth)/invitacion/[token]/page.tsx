import { Card, CardContent } from "@ligas/ui";
import type { Metadata } from "next";
import { InvitationForm } from "@/components/auth/invitation-form";

export const metadata: Metadata = { title: "Aceptar invitación" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Te invitaron a una organización</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Completa tus datos para activar tu cuenta.
      </p>

      <Card className="mt-6">
        <CardContent>
          <InvitationForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
