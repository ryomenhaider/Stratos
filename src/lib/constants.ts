import type { TaskPriority, TaskStatus } from "@/types";

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const AUTOMATION_TYPES = [
  { value: "daily_tasks", label: "Daily Task Email" },
  { value: "overdue_reminder", label: "Overdue Reminder" },
  { value: "weekly_employee_summary", label: "Weekly Employee Summary" },
  { value: "weekly_admin_report", label: "Weekly Admin Report" },
] as const;

export const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-600",
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};
