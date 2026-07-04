"use client";

import { Button } from "@ligas/ui";
import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";

/**
 * Alterna la clase de <html> y persiste en cookie (la lee el RootLayout
 * en SSR). No necesita contexto: el DOM es la fuente de verdad.
 */
export function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.remove("light", "dark");
    root.classList.add(next);
    document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
      <Sun className="size-4 dark:hidden" />
      <Moon className="size-4 hidden dark:block" />
    </Button>
  );
}
