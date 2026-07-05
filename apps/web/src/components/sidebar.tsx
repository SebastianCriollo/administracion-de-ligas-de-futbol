"use client";

import { cn } from "@ligas/ui";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Home,
  MapPin,
  Newspaper,
  Settings,
  Shield,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación del shell privado. En la Fase 9 los ítems se filtran por el
 * rol del usuario (matriz de la Fase 3 §1); por ahora muestra el set de
 * LEAGUE_ADMIN completo.
 */
const NAV = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/torneos", label: "Torneos", icon: Trophy },
  { href: "/app/equipos", label: "Equipos", icon: Shield },
  { href: "/app/jugadores", label: "Jugadores", icon: Users },
  { href: "/app/arbitros", label: "Árbitros", icon: ShieldCheck },
  { href: "/app/escenarios", label: "Escenarios", icon: MapPin },
  { href: "/app/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/app/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/app/noticias", label: "Noticias", icon: Newspaper },
  { href: "/app/reportes", label: "Reportes", icon: FileText },
] as const;

const NAV_FOOTER = [
  { href: "/app/perfil", label: "Perfil", icon: UserRound },
  { href: "/app/configuracion", label: "Configuración", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-subtle text-primary"
          : "text-foreground-muted hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/app" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          ⚽
        </span>
        Ligas
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-3">
        {NAV_FOOTER.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </aside>
  );
}
