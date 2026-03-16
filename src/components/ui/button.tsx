import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "default" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-panel hover:bg-accent/92 active:scale-[0.98]",
  secondary:
    "bg-surface text-card-foreground shadow-sm ring-1 ring-border hover:bg-muted active:scale-[0.98]",
  outline:
    "bg-card text-card-foreground ring-1 ring-border hover:bg-surface active:scale-[0.98]",
  ghost: "bg-transparent text-card-foreground hover:bg-muted active:scale-[0.98]",
  danger:
    "bg-danger text-white shadow-panel hover:bg-danger/90 active:scale-[0.98]"
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-12 px-4 text-sm",
  lg: "h-14 px-5 text-base",
  icon: "h-12 w-12"
};

export function buttonVariants({
  variant = "primary",
  size = "default",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "default", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
});
