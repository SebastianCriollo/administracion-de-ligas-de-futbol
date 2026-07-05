"use client";

import { MODALITY_CONFIG } from "@ligas/domain";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from "@ligas/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { authedApi, ApiRequestError } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * Wizard de creación de torneo (Fase 3 §3.1), condensado en 4 pasos:
 * 1 Datos y formato → 2 Equipos → 3 Preview del motor → 4 Publicar.
 */

const FORMATS = [
  { value: "LEAGUE", label: "Liga", desc: "Todos contra todos" },
  { value: "LEAGUE_PLAYOFFS", label: "Liga + Playoffs", desc: "Fase regular y llave final" },
  { value: "CUP", label: "Copa", desc: "Eliminación con 3er puesto" },
  { value: "KNOCKOUT", label: "Eliminación", desc: "Llave directa" },
  { value: "GROUPS_KNOCKOUT", label: "Grupos + Final", desc: "Estilo mundialista" },
] as const;

interface Team {
  id: string;
  name: string;
  shortName: string | null;
}

interface Season {
  id: string;
  name: string;
  year: number;
}
interface League {
  id: string;
  name: string;
  seasons: Season[];
}

interface Preview {
  stages: {
    plan: { name: string; type: string; order: number };
    rounds?: { number: number; pairings: { home: string; away: string }[] }[];
    groups?: { name: string; teamIds: string[]; rounds: unknown[] }[];
    bracket?: { roundNames: string[]; thirdPlace: unknown };
  }[];
}

export default function NewTournamentPage() {
  const { orgId } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<string>("LEAGUE");
  const [modality, setModality] = useState<string>("FUTBOL_11");
  const [selected, setSelected] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: teams } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () => authedApi<Team[]>(`/orgs/${orgId}/teams`),
  });
  const { data: leagues } = useQuery({
    queryKey: ["leagues", orgId],
    queryFn: () => authedApi<League[]>(`/orgs/${orgId}/leagues`),
  });

  const season = useMemo(() => leagues?.[0]?.seasons?.[0], [leagues]);
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? id;

  const createTeam = useMutation({
    mutationFn: (n: string) =>
      authedApi<Team>(`/orgs/${orgId}/teams`, { method: "POST", body: JSON.stringify({ name: n }) }),
    onSuccess: (team) => {
      void qc.invalidateQueries({ queryKey: ["teams", orgId] });
      setSelected((s) => [...s, team.id]);
      setNewTeam("");
    },
  });

  /** Garantiza liga+temporada (primer uso de una organización nueva). */
  const ensureSeason = async (): Promise<string> => {
    if (season) return season.id;
    const year = new Date().getFullYear();
    const league =
      leagues?.[0] ??
      (await authedApi<League>(`/orgs/${orgId}/leagues`, {
        method: "POST",
        body: JSON.stringify({ name: "Liga General" }),
      }));
    const created = await authedApi<Season>(`/orgs/${orgId}/leagues/${league.id}/seasons`, {
      method: "POST",
      body: JSON.stringify({ name: `Temporada ${year}`, year }),
    });
    void qc.invalidateQueries({ queryKey: ["leagues", orgId] });
    return created.id;
  };

  const payload = (seasonId: string) => ({
    seasonId,
    name,
    format,
    modality,
    teamIds: selected,
  });

  const doPreview = useMutation({
    mutationFn: async () =>
      authedApi<Preview>(`/orgs/${orgId}/tournaments/preview`, {
        method: "POST",
        body: JSON.stringify(payload(await ensureSeason())),
      }),
    onSuccess: (p) => {
      setPreview(p);
      setStep(3);
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : "Error generando preview"),
  });

  const doPublish = useMutation({
    mutationFn: async () => {
      const t = await authedApi<{ id: string }>(`/orgs/${orgId}/tournaments`, {
        method: "POST",
        body: JSON.stringify(payload(await ensureSeason())),
      });
      await authedApi(`/orgs/${orgId}/tournaments/${t.id}/publish`, { method: "POST" });
      return t;
    },
    onSuccess: (t) => {
      void qc.invalidateQueries({ queryKey: ["tournaments", orgId] });
      router.push(`/app/torneos/${t.id}`);
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : "Error al publicar"),
  });

  const steps = ["Formato", "Equipos", "Preview", "Publicar"];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo torneo</h1>
        <div className="mt-3 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  i + 1 < step
                    ? "bg-primary text-primary-foreground"
                    : i + 1 === step
                      ? "bg-primary-subtle text-primary ring-2 ring-primary"
                      : "bg-muted text-foreground-subtle",
                )}
              >
                {i + 1 < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  i + 1 === step ? "font-medium" : "text-foreground-subtle",
                )}
              >
                {s}
              </span>
              {i < steps.length - 1 && <span className="w-6 border-t border-border" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" required>
                Nombre del torneo
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Copa Ciudad 2026"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Formato</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      format === f.value
                        ? "border-primary bg-primary-subtle"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-foreground-muted">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Modalidad</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MODALITY_CONFIG).map(([key, m]) => (
                  <button key={key} type="button" onClick={() => setModality(key)}>
                    <Badge
                      variant={modality === key ? "primary" : "outline"}
                      className="cursor-pointer px-3 py-1"
                    >
                      {m.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={name.length < 3} onClick={() => setStep(2)}>
                Continuar <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos participantes</CardTitle>
            <p className="text-sm text-foreground-muted">
              Selecciona al menos 2. Seleccionados: {selected.length}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {teams?.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setSelected((s) => (on ? s.filter((x) => x !== t.id) : [...s, t.id]))
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      on ? "border-primary bg-primary-subtle" : "border-border hover:bg-muted",
                    )}
                  >
                    {t.name}
                    {on && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                placeholder="Crear equipo rápido…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTeam.length >= 2) createTeam.mutate(newTeam);
                }}
              />
              <Button
                variant="outline"
                loading={createTeam.isPending}
                disabled={newTeam.length < 2}
                onClick={() => createTeam.mutate(newTeam)}
              >
                <Plus className="size-4" /> Crear
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Atrás
              </Button>
              <Button
                disabled={selected.length < 2}
                loading={doPreview.isPending}
                onClick={() => doPreview.mutate()}
              >
                Generar preview <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && preview && (
        <div className="flex flex-col gap-4">
          {preview.stages.map((s) => (
            <Card key={s.plan.order}>
              <CardHeader>
                <CardTitle>
                  Etapa {s.plan.order}: {s.plan.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {s.groups?.map((g) => (
                  <div key={g.name} className="rounded-lg bg-muted p-3">
                    <p className="mb-1 text-sm font-semibold">Grupo {g.name}</p>
                    <p className="text-sm text-foreground-muted">
                      {g.teamIds.map(teamName).join(" · ")}
                    </p>
                  </div>
                ))}
                {s.rounds?.slice(0, 4).map((r) => (
                  <div key={r.number} className="rounded-lg bg-muted p-3">
                    <p className="mb-1 text-sm font-semibold">Jornada {r.number}</p>
                    {r.pairings.map((p, i) => (
                      <p key={i} className="text-sm text-foreground-muted">
                        {teamName(p.home)} <span className="font-mono">vs</span>{" "}
                        {teamName(p.away)}
                      </p>
                    ))}
                  </div>
                ))}
                {s.rounds && s.rounds.length > 4 && (
                  <p className="text-xs text-foreground-subtle">
                    … y {s.rounds.length - 4} jornadas más
                  </p>
                )}
                {s.bracket && (
                  <p className="text-sm text-foreground-muted">
                    Rondas: {s.bracket.roundNames.join(" → ")}
                    {s.bracket.thirdPlace != null && " · con tercer puesto"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                loading={doPreview.isPending}
                onClick={() => doPreview.mutate()}
              >
                <RefreshCw className="size-4" /> Regenerar
              </Button>
              <Button loading={doPublish.isPending} onClick={() => doPublish.mutate()}>
                <Check className="size-4" /> Publicar torneo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
