import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marca el campo como inválido (borde y ring en danger). */
  invalid?: boolean;
}

export function Input({ className, invalid, "aria-invalid": ariaInvalid, ...props }: InputProps) {
  const isInvalid = invalid ?? (ariaInvalid === true || ariaInvalid === "true");
  return (
    <input
      aria-invalid={isInvalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-sm border border-border bg-surface px-3 py-1 text-sm text-foreground",
        "placeholder:text-foreground-subtle",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        isInvalid && "border-danger focus-visible:ring-danger/40",
        className,
      )}
      {...props}
    />
  );
}
