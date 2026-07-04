import { MODALITY_CONFIG } from "@ligas/domain";
import { Badge, Button, Card, CardContent } from "@ligas/ui";
import { BarChart3, CalendarDays, ClipboardList, Trophy, Users, Zap } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Trophy,
    title: "Todos los formatos",
    body: "Liga, copa, grupos + eliminación, liga + playoffs, hexagonales y formatos personalizados con etapas encadenadas.",
  },
  {
    icon: Zap,
    title: "Fixture automático",
    body: "Calendario, emparejamientos, llaves y cruces generados por el motor — con preview antes de publicar.",
  },
  {
    icon: ClipboardList,
    title: "Acta digital en vivo",
    body: "El árbitro registra goles, tarjetas y cambios desde la cancha. La tabla se actualiza sola al cerrar el acta.",
  },
  {
    icon: BarChart3,
    title: "Estadísticas completas",
    body: "Goleadores, asistencias, vallas menos vencidas, fair play, rachas y jugador del partido.",
  },
  {
    icon: Users,
    title: "Roles para todos",
    body: "Administradores, árbitros, directores técnicos y jugadores — cada uno con su propia experiencia.",
  },
  {
    icon: CalendarDays,
    title: "Portal público",
    body: "Resultados, tablas y calendario consultables sin iniciar sesión, con el branding de tu organización.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-24 text-center">
        <Badge variant="primary" className="mb-6">
          Multi-torneo · Multi-modalidad
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Tu liga de fútbol, administrada como{" "}
          <span className="text-primary">profesional</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground-muted">
          Crea torneos en minutos, genera calendarios y llaves automáticamente, levanta actas
          digitales desde la cancha y publica resultados en tiempo real.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/registro">
            <Button size="lg">Crear organización gratis</Button>
          </Link>
          <Link href="#caracteristicas">
            <Button size="lg" variant="outline">
              Ver características
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="caracteristicas" className="border-t border-border bg-surface py-20">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Todo lo que una liga necesita
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-background">
                <CardContent className="pt-5">
                  <f.icon className="size-8 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-foreground-muted">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modalidades */}
      <section id="modalidades" className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Todas las modalidades</h2>
          <p className="mt-3 text-foreground-muted">
            Del fútbol 11 al futsal — cada torneo con sus propias reglas.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {Object.values(MODALITY_CONFIG).map((m) => (
              <Badge key={m.label} variant="outline" className="px-4 py-1.5 text-sm">
                {m.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
