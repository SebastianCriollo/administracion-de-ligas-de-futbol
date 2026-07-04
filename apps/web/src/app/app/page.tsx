import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LiveIndicator,
} from "@ligas/ui";
import { ArrowUpRight, Plus, Shield, ShieldCheck, Trophy, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard del LEAGUE_ADMIN.
 * Datos demo estáticos hasta la Fase 10, cuando este page consume
 * GET /orgs/{orgId}/dashboard — el layout y los componentes son finales.
 */

const KPIS = [
  { label: "Torneos activos", value: "4", delta: "+1 este mes", icon: Trophy },
  { label: "Equipos", value: "32", delta: "+3 este mes", icon: Shield },
  { label: "Jugadores", value: "486", delta: "+24 este mes", icon: Users },
  { label: "Árbitros", value: "12", delta: "estable", icon: ShieldCheck },
] as const;

const TODAY_MATCHES = [
  { time: "14:00", home: "Leones FC", away: "Águilas United", status: "scheduled" },
  { time: "71'", home: "Tigres del Sur", away: "Pumas SC", score: "2 - 1", status: "live" },
  { time: "Final", home: "Osos Negros", away: "Halcones", score: "0 - 3", status: "finished" },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-foreground-muted">Liga Deportiva Demo · Apertura 2026</p>
        </div>
        <Button>
          <Plus className="size-4" />
          Crear torneo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground-muted">{kpi.label}</p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{kpi.value}</p>
                <p className="mt-1 text-xs text-foreground-subtle">{kpi.delta}</p>
              </div>
              <kpi.icon className="size-5 text-foreground-subtle" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Partidos de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Partidos de hoy</CardTitle>
            <Badge variant="neutral">{TODAY_MATCHES.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {TODAY_MATCHES.map((m) => (
              <div key={`${m.home}-${m.away}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-14 shrink-0 text-center">
                  {m.status === "live" ? (
                    <LiveIndicator minute={m.time} />
                  ) : (
                    <span className="font-mono text-sm tabular-nums text-foreground-muted">
                      {m.time}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{m.home}</span>
                  <span className="shrink-0 font-mono font-bold tabular-nums">
                    {"score" in m ? m.score : "vs"}
                  </span>
                  <span className="truncate text-right font-medium">{m.away}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {["Programar partido", "Registrar equipo", "Designar árbitro", "Publicar noticia"].map(
              (label) => (
                <Button key={label} variant="outline" className="justify-between">
                  {label}
                  <ArrowUpRight className="size-4 text-foreground-subtle" />
                </Button>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
