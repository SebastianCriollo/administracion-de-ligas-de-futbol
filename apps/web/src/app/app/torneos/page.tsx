"use client";

import { Badge, Button, Card, CardContent, Skeleton } from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface TournamentListItem {
  id: string;
  name: string;
  format: string;
  modality: string;
  status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  season: { name: string; year: number; league: { name: string } };
  _count: { teams: number; matches: number };
}

const STATUS_BADGE = {
  DRAFT: { label: "Borrador", variant: "neutral" },
  PUBLISHED: { label: "Publicado", variant: "info" },
  IN_PROGRESS: { label: "En juego", variant: "success" },
  FINISHED: { label: "Finalizado", variant: "outline" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
} as const;

const FORMAT_LABEL: Record<string, string> = {
  LEAGUE: "Liga",
  LEAGUE_PLAYOFFS: "Liga + Playoffs",
  KNOCKOUT: "Eliminación directa",
  GROUPS_KNOCKOUT: "Grupos + Eliminación",
  CUP: "Copa",
  CUSTOM: "Personalizado",
};

export default function TournamentsPage() {
  const { orgId } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["tournaments", orgId],
    queryFn: () => authedApi<TournamentListItem[]>(`/orgs/${orgId}/tournaments`),
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Torneos</h1>
          <p className="text-sm text-foreground-muted">Todos los torneos de tu organización.</p>
        </div>
        <Link href="/app/torneos/nuevo">
          <Button>
            <Plus className="size-4" /> Nuevo torneo
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy className="size-10 text-foreground-subtle" />
            <p className="font-medium">Aún no hay torneos</p>
            <p className="max-w-sm text-sm text-foreground-muted">
              Crea el primero: el motor generará el calendario y las llaves automáticamente.
            </p>
            <Link href="/app/torneos/nuevo">
              <Button className="mt-2">
                <Plus className="size-4" /> Crear torneo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => {
            const badge = STATUS_BADGE[t.status];
            return (
              <Link key={t.id} href={`/app/torneos/${t.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{t.name}</h3>
                      <Badge variant={badge.variant} dot>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground-muted">
                      {t.season.league.name} · {t.season.name}
                    </p>
                    <div className="mt-auto flex items-center gap-2 text-xs text-foreground-subtle">
                      <Badge variant="outline">{FORMAT_LABEL[t.format] ?? t.format}</Badge>
                      <span>{t._count.teams} equipos</span>
                      <span>·</span>
                      <span>{t._count.matches} partidos</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
