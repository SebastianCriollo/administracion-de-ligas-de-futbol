/**
 * @ligas/ui — Design System de la plataforma.
 *
 * Reglas:
 *  1. Los componentes solo consumen tokens semánticos (ver styles/tokens.css).
 *  2. Todo componente expone `className` y hace merge con `cn`.
 *  3. Variantes tipadas con CVA; sin estilos mágicos fuera del sistema.
 */

export { cn } from "./lib/cn";

export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { Input, type InputProps } from "./components/input";
export { Textarea, type TextareaProps } from "./components/textarea";
export { Label, type LabelProps } from "./components/label";
export { Alert, AlertTitle, AlertDescription, type AlertProps } from "./components/alert";
export { Skeleton } from "./components/skeleton";
export { Avatar, type AvatarProps } from "./components/avatar";
export { Separator, type SeparatorProps } from "./components/separator";
export { Spinner } from "./components/spinner";
export { LiveIndicator, type LiveIndicatorProps } from "./components/live-indicator";
