import type { Employee, TaskWithRelations } from "@/types";
import { isOverdue } from "@/lib/utils";

export function isTaskOverdue(task: Pick<TaskWithRelations, "status" | "due_date">): boolean {
  return isOverdue(task.status, task.due_date);
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
}

export function computeTaskStats(tasks: TaskWithRelations[]): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const cancelled = tasks.filter((t) => t.status === "cancelled").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const pending = inProgress + todo;
  const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pending, cancelled, inProgress, todo, overdue, completionRate };
}

export interface EmployeeAnalyticsRow {
  employee: Employee;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  avgCompletionMs: number;
}

export function computeEmployeeAnalytics(
  employees: Employee[],
  tasks: TaskWithRelations[]
): EmployeeAnalyticsRow[] {
  return employees
    .map((employee) => {
      let assigned = 0;
      let completed = 0;
      let overdue = 0;
      const completionTimesMs: number[] = [];
      for (const task of tasks) {
        const isAssignee = task.assignees.some((a) => a.employee_id === employee.id);
        if (!isAssignee) continue;
        assigned += 1;
        if (task.status === "completed") {
          completed += 1;
          if (task.created_at && task.completed_at) {
            const ms = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
            if (ms >= 0) completionTimesMs.push(ms);
          }
        }
        if (isTaskOverdue(task)) overdue += 1;
      }
      return {
        employee,
        assigned,
        completed,
        pending: assigned - completed,
        overdue,
        completionRate:
          assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
        avgCompletionMs:
          completionTimesMs.length === 0
            ? 0
            : completionTimesMs.reduce((a, b) => a + b, 0) / completionTimesMs.length,
      };
    })
    .sort((a, b) => b.assigned - a.assigned);
}

export interface DepartmentAnalyticsRow {
  department: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export function computeDepartmentAnalytics(tasks: TaskWithRelations[]): DepartmentAnalyticsRow[] {
  const map = new Map<string, DepartmentAnalyticsRow>();
  for (const task of tasks) {
    const deptSet = new Set<string>();
    for (const a of task.assignees) {
      const dept = a.employee?.department;
      if (dept) deptSet.add(dept);
    }
    if (deptSet.size === 0) {
      deptSet.add("Unassigned");
    }
    for (const dept of deptSet) {
      const row = map.get(dept) ?? {
        department: dept,
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        completionRate: 0,
      };
      row.total += 1;
      if (task.status === "completed") row.completed += 1;
      if (Math.round((row.completed / row.total) * 100) > 100) {
        // no-op
      }
      if (isTaskOverdue(task)) row.overdue += 1;
      row.completionRate = Math.round((row.completed / row.total) * 100);
      map.set(dept, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface TimeSeriesPoint {
  label: string;
  created: number;
  completed: number;
}

export function buildTimeSeries(
  tasks: TaskWithRelations[],
  period: "day" | "week" | "month"
): TimeSeriesPoint[] {
  const map = new Map<string, { created: number; completed: number }>();

  for (const task of tasks) {
    const createdKey = bucketKey(task.created_at, period);
    const completedKey = task.completed_at ? bucketKey(task.completed_at, period) : null;

    addToMap(map, createdKey);
    if (completedKey) addToMap(map, completedKey);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, v]) => ({ label, created: v.created, completed: v.completed }));
}

function addToMap(
  map: Map<string, { created: number; completed: number }>,
  key: string | null
) {
  if (!key) return;
  const entry = map.get(key) ?? { created: 0, completed: 0 };
  entry.created += 1;
  map.set(key, entry);
}

function bucketKey(iso: string, period: "day" | "week" | "month"): string {
  const d = new Date(iso);
  if (period === "day") return d.toISOString().slice(0, 10);
  if (period === "month") return d.toISOString().slice(0, 7);
  // week: ISO week starting Monday
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

export interface EmployeeChartPoint {
  name: string;
  assigned: number;
  completed: number;
}

export function buildEmployeeChart(rows: EmployeeAnalyticsRow[]): EmployeeChartPoint[] {
  return rows
    .filter((r) => r.assigned > 0)
    .slice(0, 15)
    .map((r) => ({ name: r.employee.name, assigned: r.assigned, completed: r.completed }));
}

export interface DepartmentChartPoint {
  name: string;
  total: number;
}

export function buildDepartmentChart(rows: DepartmentAnalyticsRow[]): DepartmentChartPoint[] {
  return rows.map((r) => ({ name: r.department, total: r.total }));
}

export interface StatusDistributionPoint {
  name: string;
  value: number;
}

export function buildStatusDistribution(tasks: TaskWithRelations[]): StatusDistributionPoint[] {
  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  };
  return [
    { name: "To Do", value: counts.todo },
    { name: "In Progress", value: counts.in_progress },
    { name: "Completed", value: counts.completed },
    { name: "Cancelled", value: counts.cancelled },
  ];
}

export function buildCompletionOverTime(
  tasks: TaskWithRelations[],
  period: "week" | "month"
): TimeSeriesPoint[] {
  return buildTimeSeries(tasks, period);
}
