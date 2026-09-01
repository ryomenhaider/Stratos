import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>}
      <input
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
          className
        )}
        {...props}
      />
    </label>
  );
}
