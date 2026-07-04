"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@ligas/contracts";
import { Alert, AlertDescription, Button, Input, Label } from "@ligas/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiRequestError, setAccessToken } from "@/lib/api";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const { accessToken } = await api<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAccessToken(accessToken);
      router.push("/app");
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "No se pudo crear la cuenta");
    }
  });

  const field = (
    id: keyof RegisterInput,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required>
        {label}
      </Label>
      <Input id={id} invalid={!!errors[id]} {...props} {...register(id)} />
      {errors[id] && <p className="text-xs text-danger">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <Alert variant="danger">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3">
        {field("firstName", "Nombre", { autoComplete: "given-name" })}
        {field("lastName", "Apellido", { autoComplete: "family-name" })}
      </div>
      {field("email", "Correo electrónico", {
        type: "email",
        placeholder: "tu@correo.com",
        autoComplete: "email",
      })}
      {field("organizationName", "Nombre de la organización", {
        placeholder: "Liga Barrial San José",
      })}
      <div>
        {field("password", "Contraseña", { type: "password", autoComplete: "new-password" })}
        <p className="mt-1.5 text-xs text-foreground-subtle">
          Mínimo 10 caracteres, con mayúscula, minúscula y número.
        </p>
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Crear organización
      </Button>
    </form>
  );
}
