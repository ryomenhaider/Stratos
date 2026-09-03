import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOverdue(status: string, dueDate: string | null): boolean {
  if (!dueDate || status === "completed" || status === "cancelled" || status === "pending_approval") return false;
  return new Date(dueDate) < new Date();
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return startToday.getTime() === startDue.getTime();
}

export function computeCompletionRate(assigned: number, completed: number): number {
  if (assigned === 0) return 0;
  return Math.round((completed / assigned) * 100);
}

export function avgCompletionTime(timesMs: number[]): string | null {
  if (timesMs.length === 0) return null;
  const avg = timesMs.reduce((a, b) => a + b, 0) / timesMs.length;
  const days = avg / (1000 * 60 * 60 * 24);
  if (days < 1) {
    const hours = avg / (1000 * 60 * 60);
    return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  }
  const rounded = days < 10 ? days.toFixed(1) : Math.round(days).toString();
  return `${rounded.replace(/\.0$/, "")}d`;
}
