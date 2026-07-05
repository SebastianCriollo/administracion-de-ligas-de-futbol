import type { LabelHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Muestra un asterisco de campo obligatorio. */
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-foreground leading-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
