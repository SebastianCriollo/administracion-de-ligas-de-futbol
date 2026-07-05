"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface TeamRef {
  id: string;
  name: string;
  shortName: string | null;
}

interface TournamentDetail {
  id: string;
  name: string;
  status: string;
  modality: string;
  season: { name: string; league: { name: string } };
  stages: {
    id: string;
    name: string;
    order: number;
    groups: { id: string; name: string }[];
    rounds: {
      id: string;
      number: number;
      name: string | null;
      matches: {
        id: string;
        homeTeam: TeamRef | null;
        awayTeam: TeamRef | null;
        homeScore: number | null;
        awayScore: number | null;
        status: string;
      }[];
    }[];
  }[];
}

interface StandingRow {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  team: TeamRef;
  group: { id: string; name: string } | null;
  stage: { order: number };
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orgId } = useSession();

  const { data: t, isLoading } = useQuery({
    queryKey: ["tournament", orgId, id],
    queryFn: () => authedApi<TournamentDetail>(`/orgs/${orgId}/tournaments/${id}`),
  });
  const { data: standings } = useQuery({
    queryKey: ["standings", orgId, id],
    queryFn: () => authedApi<StandingRow[]>(`/orgs/${orgId}/tournaments/${id}/standings`),
  });

  if (isLoading || !t) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const groupsOf = (groupId: string | null) =>
    standings?.filter((s) => (s.group?.id ?? null) === groupId) ?? [];
  const groupIds = [...new Set(standings?.map((s) => s.group?.id ?? null) ?? [])];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t.name}</h1>
          <Badge variant="info" dot>
            {t.status}
          </Badge>
        </div>
        <p className="text-sm text-foreground-muted">
          {t.season.league.name} · {t.season.name}
        </p>
      </div>

      {/* Tablas por grupo */}
      {standings && standings.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupIds.map((gid) => {
            const rows = groupsOf(gid);
            if (!rows.length) return null;
            return (
              <Card key={gid ?? "general"}>
                <CardHeader>
                  <CardTitle>{rows[0]!.group?.name ?? "Tabla de posiciones"}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-foreground-subtle">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2">Equipo</th>
                        {["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "PTS"].map((h) => (
                          <th key={h} className="pb-2 text-center font-mono">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.team.id} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-2 text-foreground-subtle">{r.position}</td>
                          <td className="py-1.5 font-medium">{r.team.name}</td>
                          {[r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.goalDiff].map(
                            (v, i) => (
                              <td key={i} className="py-1.5 text-center font-mono tabular-nums">
                                {v}
                              </td>
                            ),
                          )}
                          <td className="py-1.5 text-center font-mono font-bold tabular-nums">
                            {r.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fixture por etapa */}
      {t.stages.map((stage) => (
        <Card key={stage.id}>
          <CardHeader>
            <CardTitle>{stage.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {stage.rounds.map((round) => (
              <div key={round.id} className="rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-semibold">{round.name ?? `Ronda ${round.number}`}</p>
                <div className="flex flex-col gap-1.5">
                  {round.matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {m.homeTeam?.name ?? "Por definir"}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-foreground-subtle">
                        {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right">
                        {m.awayTeam?.name ?? "Por definir"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
