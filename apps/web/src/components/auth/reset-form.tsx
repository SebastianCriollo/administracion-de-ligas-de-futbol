"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@ligas/contracts";
import { Alert, AlertDescription, Button, Input, Label } from "@ligas/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiRequestError } from "@/lib/api";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify(data) });
      router.push("/login");
    } catch (e) {
      setServerError(
        e instanceof ApiRequestError ? e.message : "No se pudo restablecer la contraseña",
      );
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        <p className="text-xs text-foreground-subtle">
          Mínimo 10 caracteres, con mayúscula, minúscula y número.
        </p>
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Restablecer contraseña
      </Button>
    </form>
  );
}
