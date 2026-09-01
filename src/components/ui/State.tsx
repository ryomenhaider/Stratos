import type { ReactNode } from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <p className="text-sm">{children}</p>
    </div>
  );
}
