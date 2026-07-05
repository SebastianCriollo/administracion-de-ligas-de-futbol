import { Badge, Card, CardContent, CardHeader, CardTitle } from "@ligas/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";

interface PortalHome {
  organization: { name: string; slug: string; city: string | null; country: string | null };
  tournaments: { name: string; slug: string; format: string; modality: string; status: string }[];
  todayMatches: {
    id: string;
    status: string;
    scheduledAt: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    tournament: { name: string; slug: string };
  }[];
  news: { title: string; slug: string; excerpt: string | null; publishedAt: string | null }[];
}

interface Props {
  params: Promise<{ org: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { org } = await params;
  const data = await publicApi<PortalHome>(`/${org}`);
  return {
    title: data?.organization.name ?? "Organización",
    description: `Resultados, tablas y calendario de ${data?.organization.name ?? "la liga"}.`,
  };
}

export default async function OrgPortalPage({ params }: Props) {
  const { org } = await params;
  const data = await publicApi<PortalHome>(`/${org}`);
  if (!data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{data.organization.name}</h1>
        <p className="mt-1 text-foreground-muted">
          {[data.organization.city, data.organization.country].filter(Boolean).join(", ")}
        </p>
      </div>

      {data.todayMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Partidos de hoy</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {data.todayMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-4 py-3 text-sm first:pt-0 last:pb-0">
                <span className="w-14 shrink-0 text-xs text-foreground-subtle">
                  {m.status === "FINISHED"
                    ? "Final"
                    : m.scheduledAt
                      ? new Date(m.scheduledAt).toLocaleTimeString("es", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{m.homeTeam?.name}</span>
                <span className="shrink-0 font-mono font-bold tabular-nums">
                  {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                </span>
                <span className="min-w-0 flex-1 truncate text-right font-medium">
                  {m.awayTeam?.name}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Torneos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.tournaments.map((t) => (
            <Link key={t.slug} href={`/${org}/torneos/${t.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <Badge variant={t.status === "FINISHED" ? "outline" : "success"} dot>
                      {t.status === "FINISHED" ? "Finalizado" : "Activo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {t.format.replaceAll("_", " ")} · {t.modality.replaceAll("_", " ")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {data.news.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Noticias</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.news.map((n) => (
              <Link key={n.slug} href={`/${org}/noticias/${n.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-2">
                    <p className="font-semibold leading-snug">{n.title}</p>
                    {n.excerpt && (
                      <p className="line-clamp-2 text-sm text-foreground-muted">{n.excerpt}</p>
                    )}
                    {n.publishedAt && (
                      <p className="text-xs text-foreground-subtle">
                        {new Date(n.publishedAt).toLocaleDateString("es", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
