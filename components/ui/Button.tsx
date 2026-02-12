"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center font-semibold rounded-xl transition-base focus-ring disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-sm hover:shadow-md",
  secondary:
    "bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--card-border)] border border-transparent hover:border-[var(--card-border-hover)]",
  outline:
    "border-2 border-[var(--card-border-hover)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)]",
  ghost:
    "text-[var(--foreground)] hover:bg-[var(--card)] hover:text-[var(--accent)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{rightIcon}</span>}
    </button>
  );
}

export interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {leftIcon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{rightIcon}</span>}
    </Link>
  );
}
