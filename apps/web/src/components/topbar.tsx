import { Avatar, Button } from "@ligas/ui";
import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Placeholder del command palette (⌘K) — se activa en Fase 10 */}
      <button
        type="button"
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground-subtle transition-colors hover:border-border-strong"
      >
        <Search className="size-4" aria-hidden="true" />
        Buscar…
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell className="size-4" />
        </Button>
        <Avatar size="sm" name="Sebastián Criollo" className="ml-1" />
      </div>
    </header>
  );
}
