import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface LiveIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** Minuto actual del partido, ej. "67'". Sin él muestra solo "EN VIVO". */
  minute?: string;
}

/**
 * Indicador de partido en vivo (convención Flashscore: rojo pulsante).
 * Componente de dominio — aparece en MatchRow, ficha de partido y dashboard.
 */
export function LiveIndicator({ className, minute, ...props }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold text-live",
        className,
      )}
      {...props}
    >
      <span
        className="size-2 rounded-full bg-live"
        style={{ animation: "live-pulse 1.6s var(--ease-in-out, ease-in-out) infinite" }}
        aria-hidden="true"
      />
      {minute ? (
        <span className="font-mono tabular-nums">{minute}</span>
      ) : (
        <span className="uppercase tracking-wide">En vivo</span>
      )}
    </span>
  );
}
