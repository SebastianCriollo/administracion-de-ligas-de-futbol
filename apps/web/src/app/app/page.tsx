"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LiveIndicator,
  Skeleton,
} from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Plus, Shield, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Dashboard {
  kpis: {
    tournaments: number;
    teams: number;
    players: number;
    referees: number;
    upcoming: number;
    live: number;
  };
  todayMatches: {
    id: string;
    status: string;
    minute: number | null;
    scheduledAt: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    tournament: { name: string };
  }[];
}

const LIVE_STATUSES = ["LIVE", "HALF_TIME", "EXTRA_TIME", "PENALTIES"];

export default function DashboardPage() {
  const { orgId, orgName, me } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: () => authedApi<Dashboard>(`/orgs/${orgId}/dashboard`),
    refetchInterval: 30_000,
  });

  const kpis = [
    { label: "Torneos activos", value: data?.kpis.tournaments, icon: Trophy, href: "/app/torneos" },
    { label: "Equipos", value: data?.kpis.teams, icon: Shield, href: "/app/equipos" },
    { label: "Jugadores", value: data?.kpis.players, icon: Users, href: "/app/jugadores" },
    { label: "Árbitros", value: data?.kpis.referees, icon: ShieldCheck, href: "/app/arbitros" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {me.firstName}</h1>
          <p className="text-sm text-foreground-muted">{orgName}</p>
        </div>
        <Link href="/app/torneos/nuevo">
          <Button>
            <Plus className="size-4" /> Crear torneo
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-foreground-muted">{kpi.label}</p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-8 w-12" />
                  ) : (
                    <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{kpi.value}</p>
                  )}
                </div>
                <kpi.icon className="size-5 text-foreground-subtle" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Partidos de hoy</CardTitle>
            <Badge variant="neutral">{data?.todayMatches.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !data?.todayMatches.length ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarDays className="size-8 text-foreground-subtle" />
                <p className="text-sm text-foreground-muted">No hay partidos programados para hoy.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {data.todayMatches.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="w-16 shrink-0 text-center">
                      {LIVE_STATUSES.includes(m.status) ? (
                        <LiveIndicator minute={m.minute ? `${m.minute}'` : undefined} />
                      ) : m.status === "FINISHED" ? (
                        <span className="text-xs font-medium text-foreground-subtle">Final</span>
                      ) : (
                        <span className="font-mono text-sm tabular-nums text-foreground-muted">
                          {m.scheduledAt
                            ? new Date(m.scheduledAt).toLocaleTimeString("es", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{m.homeTeam?.name ?? "Por definir"}</span>
                      <span className="shrink-0 font-mono font-bold tabular-nums">
                        {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                      </span>
                      <span className="truncate text-right font-medium">
                        {m.awayTeam?.name ?? "Por definir"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              { label: "Nuevo torneo", href: "/app/torneos/nuevo" },
              { label: "Registrar equipo", href: "/app/equipos" },
              { label: "Ver torneos", href: "/app/torneos" },
            ].map((a) => (
              <Link key={a.href + a.label} href={a.href}>
                <Button variant="outline" className="w-full justify-between">
                  {a.label}
                  <ArrowUpRight className="size-4 text-foreground-subtle" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
