import type { ComponentPropsWithRef } from "react";
/** Native button contract; loading blocks repeat activation while retaining its accessible name. */
export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
/** Ordinary application buttons share variants, focus, disabled/loading semantics and native refs. */
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={`ui-button ${className}`.trim()}
    >
      {children}
    </button>
  );
}
