"use client";

import { Badge, Card, CardContent, LiveIndicator, Skeleton } from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface MatchRow {
  id: string;
  status: string;
  minute: number | null;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  tournament: { id: string; name: string };
  round: { name: string | null; number: number } | null;
}

const LIVE = ["LIVE", "HALF_TIME", "EXTRA_TIME", "PENALTIES"];

export default function MatchesPage() {
  const { orgId } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["matches", orgId],
    queryFn: () => authedApi<MatchRow[]>(`/orgs/${orgId}/matches`),
    refetchInterval: 20_000,
  });

  const byTournament = new Map<string, MatchRow[]>();
  for (const m of data ?? []) {
    const list = byTournament.get(m.tournament.name) ?? [];
    list.push(m);
    byTournament.set(m.tournament.name, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partidos</h1>
        <p className="text-sm text-foreground-muted">
          Abre un partido para operar su acta digital.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="size-10 text-foreground-subtle" />
            <p className="font-medium">No hay partidos</p>
            <p className="text-sm text-foreground-muted">
              Publica un torneo para generar el calendario.
            </p>
          </CardContent>
        </Card>
      ) : (
        [...byTournament.entries()].map(([tournament, matches]) => (
          <Card key={tournament}>
            <CardContent className="flex flex-col divide-y divide-border">
              <p className="pb-3 text-sm font-semibold">{tournament}</p>
              {matches.map((m) => (
                <Link
                  key={m.id}
                  href={`/app/acta/${m.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="w-16 shrink-0 text-center">
                    {LIVE.includes(m.status) ? (
                      <LiveIndicator minute={m.minute ? `${m.minute}'` : undefined} />
                    ) : m.status === "FINISHED" ? (
                      <span className="text-xs font-medium text-foreground-subtle">Final</span>
                    ) : m.status === "SCHEDULED" ? (
                      <span className="text-xs text-foreground-subtle">
                        {m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleDateString("es", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "Por jugar"}
                      </span>
                    ) : (
                      <Badge variant="neutral" className="text-[10px]">
                        {m.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.homeTeam?.name ?? "Por definir"}
                    </span>
                    <span className="shrink-0 font-mono font-bold tabular-nums">
                      {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-right font-medium">
                      {m.awayTeam?.name ?? "Por definir"}
                    </span>
                  </div>
                  <span className="hidden w-20 shrink-0 text-right text-xs text-foreground-subtle sm:block">
                    {m.round?.name ?? ""}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
