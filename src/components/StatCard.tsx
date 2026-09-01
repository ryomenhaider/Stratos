import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "green" | "red" | "blue";
  sub?: string;
}) {
  const tones = {
    default: "bg-primary-50 text-primary-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}