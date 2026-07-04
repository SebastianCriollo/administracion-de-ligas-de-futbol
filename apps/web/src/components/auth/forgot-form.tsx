"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@ligas/contracts";
import { Alert, AlertDescription, Button, Input, Label } from "@ligas/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (data) => {
    await api("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }).catch(
      () => undefined, // misma UX exista o no el correo
    );
    setSent(true);
  });

  if (sent) {
    return (
      <Alert variant="success">
        <AlertDescription>
          Si el correo existe, te enviamos un enlace de recuperación. Revisa tu bandeja.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Enviar enlace
      </Button>
    </form>
  );
}
