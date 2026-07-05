"use client";

import { Avatar, Card, CardContent, CardHeader, CardTitle, Skeleton, cn } from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Tournament {
  id: string;
  name: string;
}
interface ScorerRow {
  playerId: string;
  _count: { _all: number };
  player: { firstName: string; lastName: string; photoUrl: string | null } | null;
  team: { name: string; shortName: string | null } | null;
}
interface CardsRow {
  playerId: string;
  yellow: number;
  red: number;
  player: { firstName: string; lastName: string; photoUrl: string | null } | null;
  team: { name: string } | null;
}

export default function StatsPage() {
  const { orgId } = useSession();
  const [tid, setTid] = useState<string | null>(null);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", orgId],
    queryFn: () => authedApi<Tournament[]>(`/orgs/${orgId}/tournaments`),
  });
  const active = tid ?? tournaments?.[0]?.id;

  const { data: scorers, isLoading: l1 } = useQuery({
    queryKey: ["scorers", orgId, active],
    queryFn: () => authedApi<ScorerRow[]>(`/orgs/${orgId}/tournaments/${active}/stats/scorers`),
    enabled: !!active,
  });
  const { data: cards, isLoading: l2 } = useQuery({
    queryKey: ["cards", orgId, active],
    queryFn: () => authedApi<CardsRow[]>(`/orgs/${orgId}/tournaments/${active}/stats/cards`),
    enabled: !!active,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-sm text-foreground-muted">Rankings calculados desde las actas.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tournaments?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTid(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              t.id === active
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border text-foreground-muted hover:bg-muted",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Máximos goleadores</CardTitle>
          </CardHeader>
          <CardContent>
            {l1 ? (
              <Skeleton className="h-40" />
            ) : !scorers?.length ? (
              <p className="py-8 text-center text-sm text-foreground-muted">
                Aún no hay goles con jugador registrado.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {scorers.map((s, i) => (
                  <div key={s.playerId} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 text-center font-mono text-sm text-foreground-subtle">
                      {i + 1}
                    </span>
                    <Avatar
                      size="sm"
                      name={`${s.player?.firstName} ${s.player?.lastName}`}
                      src={s.player?.photoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.player?.firstName} {s.player?.lastName}
                      </p>
                      <p className="text-xs text-foreground-muted">{s.team?.name}</p>
                    </div>
                    <span className="font-mono text-lg font-bold tabular-nums">
                      {s._count._all}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjetas</CardTitle>
          </CardHeader>
          <CardContent>
            {l2 ? (
              <Skeleton className="h-40" />
            ) : !cards?.length ? (
              <p className="py-8 text-center text-sm text-foreground-muted">
                Sin tarjetas con jugador registrado.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {cards.map((c) => (
                  <div key={c.playerId} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.player?.firstName} {c.player?.lastName}
                      </p>
                      <p className="text-xs text-foreground-muted">{c.team?.name}</p>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-sm tabular-nums">
                      <span className="inline-block size-3 rounded-[2px] bg-warning" /> {c.yellow}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-sm tabular-nums">
                      <span className="inline-block size-3 rounded-[2px] bg-danger" /> {c.red}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
