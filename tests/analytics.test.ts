import { describe, expect, it } from "vitest";
import {
  buildStatusDistribution,
  computeDepartmentAnalytics,
  computeEmployeeAnalytics,
  computeTaskStats,
} from "../src/lib/analytics";
import type { Employee, TaskWithRelations } from "../src/types";

function mkTask(partial: Partial<TaskWithRelations>): TaskWithRelations {
  return {
    id: partial.id ?? "1",
    title: partial.title ?? "Task",
    description: null,
    created_by: null,
    status: partial.status ?? "todo",
    priority: partial.priority ?? "medium",
    due_date: partial.due_date ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: partial.completed_at ?? null,
    completed_by: partial.completed_by ?? null,
    github_issue_id: partial.github_issue_id ?? null,
    github_issue_url: partial.github_issue_url ?? null,
    assignees: partial.assignees ?? [],
    completed_by_employee: null,
    created_by_employee: null,
  };
}

const sarah: Employee = {
  id: "e1",
  name: "Sara",
  email: "sara@company.com",
  department: "Design",
  role: "Designer",
  github_username: null,
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const ahmed: Employee = {
  id: "e2",
  name: "Ahmed",
  email: "ahmed@company.com",
  department: "Engineering",
  role: "Developer",
  github_username: "ahmed123",
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("computeTaskStats", () => {
  it("counts statuses and completion rate", () => {
    const tasks: TaskWithRelations[] = [
      mkTask({ id: "1", status: "completed" }),
      mkTask({ id: "2", status: "completed" }),
      mkTask({ id: "3", status: "todo" }),
      mkTask({ id: "4", status: "in_progress" }),
      mkTask({ id: "5", status: "cancelled" }),
      mkTask({ id: "6", status: "todo", due_date: "2020-01-01" }),
    ];
    const stats = computeTaskStats(tasks);
    expect(stats.total).toBe(6);
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(3);
    expect(stats.cancelled).toBe(1);
    expect(stats.inProgress).toBe(1);
    expect(stats.todo).toBe(2);
    expect(stats.overdue).toBe(1);
    expect(stats.completionRate).toBe(33);
  });

  it("returns 0 rate for empty list", () => {
    const stats = computeTaskStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.overdue).toBe(0);
  });
});

describe("computeEmployeeAnalytics", () => {
  it("computes per-employee metrics", () => {
    const tasks: TaskWithRelations[] = [
      mkTask({
        id: "1",
        status: "completed",
        assignees: [{ employee_id: "e1", assigned_at: "2026-01-01", employee: sarah }],
        created_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-03T00:00:00Z",
      }),
      mkTask({
        id: "2",
        status: "todo",
        due_date: "2020-01-01",
        assignees: [{ employee_id: "e1", assigned_at: "2026-01-01", employee: sarah }],
      }),
      mkTask({
        id: "3",
        status: "completed",
        assignees: [{ employee_id: "e2", assigned_at: "2026-01-01", employee: ahmed }],
      }),
    ];
    const rows = computeEmployeeAnalytics([sarah, ahmed], tasks);
    expect(rows).toHaveLength(2);

    const sara = rows.find((r) => r.employee.id === "e1");
    expect(sara?.assigned).toBe(2);
    expect(sara?.completed).toBe(1);
    expect(sara?.pending).toBe(1);
    expect(sara?.overdue).toBe(1);
    expect(sara?.completionRate).toBe(50);

    const ahm = rows.find((r) => r.employee.id === "e2");
    expect(ahm?.assigned).toBe(1);
    expect(ahm?.completed).toBe(1);
    expect(ahm?.completionRate).toBe(100);
  });

  it("treats zero assigned as zero rate", () => {
    const rows = computeEmployeeAnalytics([sarah], []);
    const sara = rows.find((r) => r.employee.id === "e1");
    expect(sara?.assigned).toBe(0);
    expect(sara?.completionRate).toBe(0);
  });
});

describe("computeDepartmentAnalytics", () => {
  it("groups by department of assignees", () => {
    const tasks: TaskWithRelations[] = [
      mkTask({
        id: "1",
        status: "completed",
        assignees: [{ employee_id: "e1", assigned_at: "2026-01-01", employee: sarah }],
      }),
      mkTask({
        id: "2",
        status: "todo",
        due_date: "2020-01-01",
        assignees: [{ employee_id: "e1", assigned_at: "2026-01-01", employee: sarah }],
      }),
    ];
    const rows = computeDepartmentAnalytics(tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0].department).toBe("Design");
    expect(rows[0].total).toBe(2);
    expect(rows[0].completed).toBe(1);
    expect(rows[0].overdue).toBe(1);
    expect(rows[0].completionRate).toBe(50);
  });
});

describe("buildStatusDistribution", () => {
  it("counts each status bucket", () => {
    const tasks: TaskWithRelations[] = [
      mkTask({ status: "todo" }),
      mkTask({ status: "in_progress" }),
      mkTask({ status: "completed" }),
      mkTask({ status: "cancelled" }),
    ];
    const dist = buildStatusDistribution(tasks);
    const byName = Object.fromEntries(dist.map((d) => [d.name, d.value]));
    expect(byName["To Do"]).toBe(1);
    expect(byName["In Progress"]).toBe(1);
    expect(byName["Completed"]).toBe(1);
    expect(byName["Cancelled"]).toBe(1);
  });
});