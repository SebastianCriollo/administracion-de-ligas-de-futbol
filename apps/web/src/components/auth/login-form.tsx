"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@ligas/contracts";
import { Alert, AlertDescription, Button, Input, Label } from "@ligas/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiRequestError, setAccessToken } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const { accessToken } = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAccessToken(accessToken);
      router.push("/app");
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : "No se pudo iniciar sesión");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <Alert variant="danger">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
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
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/recuperar" className="text-xs text-primary hover:underline">
            ¿La olvidaste?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Iniciar sesión
      </Button>
    </form>
  );
}
