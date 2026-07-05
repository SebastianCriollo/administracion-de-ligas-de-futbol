import { Card, CardContent, CardHeader, CardTitle } from "@ligas/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";

interface TeamRef {
  id: string;
  name: string;
  shortName: string | null;
}
interface PublicTournament {
  organization: { name: string };
  tournament: {
    name: string;
    season: { name: string; league: { name: string } };
    stages: {
      id: string;
      name: string;
      rounds: {
        id: string;
        number: number;
        name: string | null;
        matches: {
          id: string;
          status: string;
          homeScore: number | null;
          awayScore: number | null;
          homePenalties: number | null;
          awayPenalties: number | null;
          homeTeam: TeamRef | null;
          awayTeam: TeamRef | null;
        }[];
      }[];
    }[];
    standings: {
      position: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
      form: string | null;
      team: TeamRef;
      group: { id: string; name: string } | null;
      stage: { order: number };
    }[];
  };
}

interface Props {
  params: Promise<{ org: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { org, slug } = await params;
  const data = await publicApi<PublicTournament>(`/${org}/tournaments/${slug}`);
  return {
    title: data ? `${data.tournament.name} · ${data.organization.name}` : "Torneo",
    description: data
      ? `Tabla de posiciones, resultados y calendario de ${data.tournament.name}.`
      : undefined,
  };
}

export default async function PublicTournamentPage({ params }: Props) {
  const { org, slug } = await params;
  const data = await publicApi<PublicTournament>(`/${org}/tournaments/${slug}`);
  if (!data) notFound();
  const t = data.tournament;

  const groupIds = [...new Set(t.standings.map((s) => s.group?.id ?? null))];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.name}</h1>
        <p className="mt-1 text-foreground-muted">
          {t.season.league.name} · {t.season.name} · {data.organization.name}
        </p>
      </div>

      {/* Tablas */}
      {t.standings.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {groupIds.map((gid) => {
            const rows = t.standings.filter((s) => (s.group?.id ?? null) === gid);
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
                        {["PJ", "PG", "PE", "PP", "DG", "PTS"].map((h) => (
                          <th key={h} className="pb-2 text-center font-mono">
                            {h}
                          </th>
                        ))}
                        <th className="pb-2 text-center">Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.team.id} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-2 text-foreground-subtle">{r.position}</td>
                          <td className="py-1.5 font-medium">{r.team.name}</td>
                          {[r.played, r.won, r.drawn, r.lost, r.goalDiff].map((v, i) => (
                            <td key={i} className="py-1.5 text-center font-mono tabular-nums">
                              {v}
                            </td>
                          ))}
                          <td className="py-1.5 text-center font-mono font-bold tabular-nums">
                            {r.points}
                          </td>
                          <td className="py-1.5 text-center">
                            <span className="inline-flex gap-0.5">
                              {(r.form ?? "").split("").map((c, i) => (
                                <span
                                  key={i}
                                  className={
                                    "inline-block size-2 rounded-full " +
                                    (c === "W"
                                      ? "bg-success"
                                      : c === "D"
                                        ? "bg-draw"
                                        : "bg-danger")
                                  }
                                />
                              ))}
                            </span>
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

      {/* Resultados y calendario */}
      {t.stages.map((stage) => (
        <Card key={stage.id}>
          <CardHeader>
            <CardTitle>{stage.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {stage.rounds.map((round) => (
              <div key={round.id} className="rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-semibold">
                  {round.name ?? `Ronda ${round.number}`}
                </p>
                <div className="flex flex-col gap-1.5">
                  {round.matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {m.homeTeam?.name ?? "Por definir"}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-foreground-muted">
                        {m.homeScore !== null
                          ? `${m.homeScore}-${m.awayScore}` +
                            (m.homePenalties !== null ? ` (${m.homePenalties}-${m.awayPenalties} p)` : "")
                          : "vs"}
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
