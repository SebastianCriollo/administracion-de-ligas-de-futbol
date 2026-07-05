"use client";

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  LiveIndicator,
  Separator,
  Skeleton,
  cn,
} from "@ligas/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, CircleAlert, Goal, Square } from "lucide-react";
import { use, useState } from "react";
import { ApiRequestError, authedApi, downloadFile } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * Acta digital del árbitro (Fase 3 §4.3): móvil-primero, botones táctiles
 * grandes, registro de evento en ≤3 taps (evento → equipo/jugador → listo).
 */

interface RosterEntry {
  shirtNumber: number | null;
  player: { id: string; firstName: string; lastName: string };
}
interface MatchDetail {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  homeTeam: { id: string; name: string; shortName: string | null; roster: RosterEntry[] } | null;
  awayTeam: { id: string; name: string; shortName: string | null; roster: RosterEntry[] } | null;
  tournament: { name: string };
  round: { name: string | null } | null;
  events: {
    id: string;
    type: string;
    minute: number | null;
    teamId: string | null;
    player: { firstName: string; lastName: string } | null;
  }[];
  report: { status: string } | null;
}

const EVENT_META: Record<string, { label: string; icon: typeof Goal; color: string }> = {
  GOAL: { label: "Gol", icon: Goal, color: "text-success" },
  PENALTY_GOAL: { label: "Gol de penal", icon: Goal, color: "text-success" },
  OWN_GOAL: { label: "Autogol", icon: Goal, color: "text-danger" },
  YELLOW_CARD: { label: "Amarilla", icon: Square, color: "text-warning" },
  SECOND_YELLOW: { label: "2ª amarilla", icon: Square, color: "text-danger" },
  RED_CARD: { label: "Roja", icon: Square, color: "text-danger" },
  SUBSTITUTION: { label: "Cambio", icon: ArrowLeftRight, color: "text-info" },
  INCIDENT: { label: "Incidencia", icon: CircleAlert, color: "text-foreground-muted" },
  SHOOTOUT_GOAL: { label: "Penal anotado", icon: Goal, color: "text-success" },
  SHOOTOUT_MISS: { label: "Penal fallado", icon: Goal, color: "text-danger" },
};

const LIVE = ["LIVE", "HALF_TIME", "EXTRA_TIME", "PENALTIES"];

export default function ActaPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { orgId } = useSession();
  const qc = useQueryClient();
  const [picking, setPicking] = useState<null | { type: string }>(null);
  const [minute, setMinute] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: m, isLoading } = useQuery({
    queryKey: ["match", orgId, matchId],
    queryFn: () => authedApi<MatchDetail>(`/orgs/${orgId}/matches/${matchId}`),
    refetchInterval: 10_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["match", orgId, matchId] });
  const onError = (e: unknown) =>
    setError(e instanceof ApiRequestError ? e.message : "Error de conexión");

  const doTransition = useMutation({
    mutationFn: (action: string) =>
      authedApi(`/orgs/${orgId}/matches/${matchId}/transitions`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
  });

  const addEvent = useMutation({
    mutationFn: (body: { type: string; teamId: string; playerId?: string }) =>
      authedApi(`/orgs/${orgId}/matches/${matchId}/events`, {
        method: "POST",
        body: JSON.stringify({ ...body, minute: minute ? Number(minute) : undefined }),
      }),
    onSuccess: () => {
      setPicking(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const closeReport = useMutation({
    mutationFn: () =>
      authedApi(`/orgs/${orgId}/matches/${matchId}/report/close`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
  });

  if (isLoading || !m) return <Skeleton className="mx-auto h-96 w-full max-w-lg" />;

  const closed = m.report?.status === "CLOSED" || m.report?.status === "OFFICIAL";
  const isLive = LIVE.includes(m.status);
  const teamName = (id: string | null) =>
    id === m.homeTeam?.id ? m.homeTeam.name : id === m.awayTeam?.id ? (m.awayTeam?.name ?? "") : "";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      {/* Marcador */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-5">
          <p className="text-xs text-foreground-muted">
            {m.tournament.name} {m.round?.name ? `· ${m.round.name}` : ""}
          </p>
          <div className="flex w-full items-center justify-between gap-3">
            <p className="flex-1 text-center text-sm font-semibold">{m.homeTeam?.name}</p>
            <p className="shrink-0 font-mono text-4xl font-bold tabular-nums">
              {m.homeScore ?? 0} : {m.awayScore ?? 0}
            </p>
            <p className="flex-1 text-center text-sm font-semibold">{m.awayTeam?.name}</p>
          </div>
          {m.homePenalties !== null && (
            <p className="font-mono text-sm text-foreground-muted">
              Penales {m.homePenalties} - {m.awayPenalties}
            </p>
          )}
          {isLive ? (
            <LiveIndicator />
          ) : (
            <Badge variant={m.status === "FINISHED" ? "outline" : "info"}>{m.status}</Badge>
          )}
          {closed && (
            <>
              <Badge variant="success" dot>
                Acta cerrada
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadFile(`/orgs/${orgId}/reports/match/${matchId}/acta`, `acta-${matchId}.pdf`)
                }
              >
                Descargar acta oficial (PDF)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controles de estado */}
      {!closed && (
        <div className="grid grid-cols-2 gap-2">
          {m.status === "SCHEDULED" && (
            <Button size="touch" className="col-span-2" onClick={() => doTransition.mutate("START")}>
              Iniciar partido
            </Button>
          )}
          {m.status === "LIVE" && (
            <>
              <Button size="touch" variant="secondary" onClick={() => doTransition.mutate("HALF_TIME")}>
                Descanso
              </Button>
              <Button size="touch" variant="destructive" onClick={() => doTransition.mutate("FINISH")}>
                Finalizar
              </Button>
              <Button size="touch" variant="outline" onClick={() => doTransition.mutate("START_PENALTIES")}>
                Penales
              </Button>
            </>
          )}
          {m.status === "HALF_TIME" && (
            <Button size="touch" className="col-span-2" onClick={() => doTransition.mutate("RESUME")}>
              Reanudar 2T
            </Button>
          )}
          {m.status === "PENALTIES" && (
            <Button size="touch" variant="destructive" className="col-span-2" onClick={() => doTransition.mutate("FINISH")}>
              Finalizar tanda
            </Button>
          )}
          {(m.status === "FINISHED" || m.status === "WALKOVER") && (
            <Button
              size="touch"
              className="col-span-2"
              loading={closeReport.isPending}
              onClick={() => closeReport.mutate()}
            >
              Cerrar acta oficial
            </Button>
          )}
        </div>
      )}

      {/* Registro de eventos */}
      {isLive && !closed && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={minute}
                onChange={(e) => setMinute(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="Min"
                className="h-10 w-16 rounded-sm border border-border bg-surface px-2 text-center font-mono text-sm"
              />
              <p className="text-xs text-foreground-muted">Minuto del evento (opcional)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(m.status === "PENALTIES"
                ? ["SHOOTOUT_GOAL", "SHOOTOUT_MISS"]
                : ["GOAL", "YELLOW_CARD", "RED_CARD", "OWN_GOAL"]
              ).map((type) => {
                const meta = EVENT_META[type]!;
                return (
                  <Button
                    key={type}
                    size="touch"
                    variant="outline"
                    className={cn("justify-start", meta.color)}
                    onClick={() => setPicking({ type })}
                  >
                    <meta.icon className="size-5" /> {meta.label}
                  </Button>
                );
              })}
            </div>

            {/* Selector equipo → jugador (≤3 taps) */}
            {picking && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-semibold">
                  {EVENT_META[picking.type]!.label}: ¿de quién?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[m.homeTeam, m.awayTeam].map(
                    (team) =>
                      team && (
                        <div key={team.id} className="flex flex-col gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => addEvent.mutate({ type: picking.type, teamId: team.id })}
                          >
                            {team.shortName ?? team.name}
                          </Button>
                          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                            {team.roster.map((r) => (
                              <button
                                key={r.player.id}
                                type="button"
                                className="rounded-sm border border-border px-2 py-1.5 text-left text-xs hover:bg-muted"
                                onClick={() =>
                                  addEvent.mutate({
                                    type: picking.type,
                                    teamId: team.id,
                                    playerId: r.player.id,
                                  })
                                }
                              >
                                {r.shirtNumber ? `#${r.shirtNumber} ` : ""}
                                {r.player.firstName} {r.player.lastName}
                              </button>
                            ))}
                          </div>
                        </div>
                      ),
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPicking(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="flex flex-col gap-1">
          <p className="pb-2 text-sm font-semibold">Eventos del partido</p>
          {m.events.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground-muted">Sin eventos registrados.</p>
          ) : (
            [...m.events].reverse().map((e) => {
              const meta = EVENT_META[e.type] ?? EVENT_META["INCIDENT"]!;
              return (
                <div key={e.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-9 shrink-0 text-right font-mono text-xs text-foreground-subtle">
                    {e.minute !== null ? `${e.minute}'` : "—"}
                  </span>
                  <meta.icon className={cn("size-4 shrink-0", meta.color)} />
                  <span className="min-w-0 flex-1 truncate">
                    {meta.label}
                    {e.player ? ` · ${e.player.firstName} ${e.player.lastName}` : ""}
                    <span className="text-foreground-subtle"> ({teamName(e.teamId)})</span>
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="pb-4 text-center text-xs text-foreground-subtle">
        Al cerrar el acta se recalcula la tabla y avanzan las llaves automáticamente.
      </p>
    </div>
  );
}
