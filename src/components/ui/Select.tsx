import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>}
      <select
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
