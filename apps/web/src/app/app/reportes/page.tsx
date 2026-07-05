"use client";

import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@ligas/ui";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { authedApi, downloadFile } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Tournament {
  id: string;
  name: string;
  slug: string;
}

const REPORTS = [
  { key: "standings", label: "Tabla de posiciones", desc: "PJ, PG, PE, PP, GF, GC, DG, PTS y fair play" },
  { key: "schedule", label: "Calendario y resultados", desc: "Todos los partidos con estado, fecha y escenario" },
  { key: "scorers", label: "Máximos goleadores", desc: "Ranking de goles (sin autogoles)" },
] as const;

const FORMATS = [
  { key: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "csv", label: "CSV", icon: FileDown },
] as const;

export default function ReportsPage() {
  const { orgId } = useSession();
  const [tid, setTid] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", orgId],
    queryFn: () => authedApi<Tournament[]>(`/orgs/${orgId}/tournaments`),
  });
  const active = tournaments?.find((t) => t.id === (tid ?? tournaments?.[0]?.id));

  const download = async (report: string, format: string) => {
    if (!active) return;
    setBusy(`${report}:${format}`);
    setError(null);
    try {
      await downloadFile(
        `/orgs/${orgId}/reports/${report}?tournamentId=${active.id}&format=${format}`,
        `${report}-${active.slug}.${format}`,
      );
    } catch {
      setError("No se pudo generar el reporte");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-foreground-muted">
          Exporta la información oficial del torneo en Excel, PDF o CSV.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tournaments?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTid(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              t.id === active?.id
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border text-foreground-muted hover:bg-muted",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <CardTitle className="text-sm">{r.label}</CardTitle>
              <p className="text-xs text-foreground-muted">{r.desc}</p>
            </CardHeader>
            <CardContent className="flex gap-2 pt-0">
              {FORMATS.map((f) => (
                <Button
                  key={f.key}
                  variant="outline"
                  size="sm"
                  disabled={!active}
                  loading={busy === `${r.key}:${f.key}`}
                  onClick={() => download(r.key, f.key)}
                >
                  <f.icon className="size-3.5" /> {f.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-foreground-subtle">
        El acta oficial en PDF de cada partido se descarga desde su acta digital una vez cerrada.
      </p>
    </div>
  );
}
