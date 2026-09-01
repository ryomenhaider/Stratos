import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          primary: "bg-primary-600 text-white hover:bg-primary-700",
          secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
          danger: "bg-red-600 text-white hover:bg-red-700",
          ghost: "text-gray-600 hover:bg-gray-100",
        }[variant],
        {
          sm: "px-2.5 py-1.5 text-xs",
          md: "px-4 py-2 text-sm",
          lg: "px-5 py-2.5 text-base",
        }[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
