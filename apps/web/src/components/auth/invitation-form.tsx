"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInvitationSchema, type AcceptInvitationInput } from "@ligas/contracts";
import { Alert, AlertDescription, Button, Input, Label } from "@ligas/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiRequestError, setAccessToken } from "@/lib/api";

export function InvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const { accessToken } = await api<{ accessToken: string }>("/auth/invitations/accept", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAccessToken(accessToken);
      router.push("/app");
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "No se pudo activar la cuenta");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <Alert variant="danger">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" {...register("token")} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName" required>
            Nombre
          </Label>
          <Input id="firstName" invalid={!!errors.firstName} {...register("firstName")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName" required>
            Apellido
          </Label>
          <Input id="lastName" invalid={!!errors.lastName} {...register("lastName")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" required>
          Contraseña
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Activar mi cuenta
      </Button>
    </form>
  );
}
