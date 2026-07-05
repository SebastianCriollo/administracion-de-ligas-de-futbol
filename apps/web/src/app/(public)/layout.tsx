import { Button } from "@ligas/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              ⚽
            </span>
            Ligas
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-foreground-muted md:flex">
            <Link href="#caracteristicas" className="hover:text-foreground transition-colors">
              Características
            </Link>
            <Link href="#formatos" className="hover:text-foreground transition-colors">
              Formatos
            </Link>
            <Link href="#modalidades" className="hover:text-foreground transition-colors">
              Modalidades
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/registro" className="hidden sm:block">
              <Button size="sm">Crear organización</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-foreground-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} Ligas</span>
          <span>Gestión profesional de torneos de fútbol</span>
        </div>
      </footer>
    </div>
  );
}
