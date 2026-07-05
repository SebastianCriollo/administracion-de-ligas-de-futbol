"use client";

import { Avatar, Button, Card, CardContent, Input, Skeleton } from "@ligas/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield } from "lucide-react";
import { useState } from "react";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Team {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  crestUrl: string | null;
  isActive: boolean;
  _count: { roster: number };
}

export default function TeamsPage() {
  const { orgId } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () => authedApi<Team[]>(`/orgs/${orgId}/teams`),
  });

  const create = useMutation({
    mutationFn: () =>
      authedApi<Team>(`/orgs/${orgId}/teams`, {
        method: "POST",
        body: JSON.stringify({ name, city: city || undefined }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["teams", orgId] });
      setName("");
      setCity("");
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipos</h1>
        <p className="text-sm text-foreground-muted">
          {data?.length ?? "…"} equipos registrados en tu organización.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del equipo" />
          </div>
          <div className="min-w-40">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad (opcional)" />
          </div>
          <Button
            disabled={name.length < 2}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="size-4" /> Registrar equipo
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Shield className="size-10 text-foreground-subtle" />
            <p className="font-medium">Aún no hay equipos</p>
            <p className="text-sm text-foreground-muted">Registra el primero con el formulario de arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3">
                <Avatar name={t.name} src={t.crestUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {t.shortName} · {t.city ?? "—"} · {t._count.roster} jugadores
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
