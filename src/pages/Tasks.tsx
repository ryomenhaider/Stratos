import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { Empty, Spinner } from "@/components/ui/State";
import { useEmployees, useTasks } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { TaskPriority } from "@/types";

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "medium" as TaskPriority,
  due_date: "",
  employee_ids: [] as string[],
  create_github_issue: false,
};

export default function Tasks() {
  const tasksState = useTasks();
  const employeesState = useEmployees(true);

  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all" as string);
  const [priorityFilter, setPriorityFilter] = useState("all" as string);
  const [githubFilter, setGithubFilter] = useState("all" as string);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employees = employeesState.data ?? [];

  const filtered = useMemo(() => {
    const tasks = tasksState.data ?? [];
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (overdueOnly && !isOverdue(task.status, task.due_date)) return false;
      if (githubFilter === "linked" && !task.github_issue_url) return false;
      if (githubFilter === "notlinked" && task.github_issue_url) return false;
      if (deptFilter) {
        const hasDept = task.assignees.some((a) => a.employee?.department === deptFilter);
        if (!hasDept) return false;
      }
      if (employeeFilter) {
        const hasEmp = task.assignees.some((a) => a.employee_id === employeeFilter);
        if (!hasEmp) return false;
      }
      if (
        search &&
        !task.title.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [tasksState.data, search, employeeFilter, deptFilter, statusFilter, priorityFilter, githubFilter, overdueOnly]);

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  function toggleAssignee(id: string) {
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter((x) => x !== id)
        : [...f.employee_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);
    if (!form.title.trim()) {
      setError("Task title is required.");
      setSaving(false);
      return;
    }
    if (form.employee_ids.length === 0) {
      setError("Assign at least one employee.");
      setSaving(false);
      return;
    }

    let githubIssueId: number | null = null;
    let githubIssueUrl: string | null = null;

    if (form.create_github_issue) {
      try {
        const assigned = employees.filter((e) => form.employee_ids.includes(e.id));
        const githubUsers = assigned
          .map((e) => e.github_username)
          .filter((u): u is string => !!u);
        const body =
          form.description ||
          "Created from Stratos task" +
            (githubUsers.length > 0 ? `\n\nAssignees: @${githubUsers.join(", @")}` : "");
        const { data, error: ghErr } = await supabase.functions.invoke("create-github-issue", {
          body: { title: form.title.trim(), body },
        });
        if (ghErr) throw new Error(ghErr.message);
        if (data?.issue_id) {
          githubIssueId = data.issue_id;
          githubIssueUrl = data.issue_url;
        }
      } catch (err) {
        // GitHub integration is optional. If issue creation fails (e.g. the
        // GITHUB_TOKEN secret isn't configured), create the task anyway.
        setFeedback(
          `Task will be created, but the GitHub issue could not be created: ${
            err instanceof Error ? err.message : "unknown error"
          }`
        );
      }
    }

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null,
        status: "todo",
        github_issue_id: githubIssueId,
        github_issue_url: githubIssueUrl,
      })
      .select()
      .single();

    if (taskErr) {
      setError(taskErr.message);
      setSaving(false);
      return;
    }

    const rows = form.employee_ids.map((employee_id) => ({
      task_id: task.id,
      employee_id,
    }));
    const { error: assignErr } = await supabase.from("task_assignees").insert(rows);
    if (assignErr) {
      setError(assignErr.message);
      setSaving(false);
      return;
    }

    const historyRows: { task_id: string; employee_id: string | null; action: string; old_status: string | null; new_status: string }[] = form.employee_ids.map((employee_id) => ({
      task_id: task.id,
      employee_id,
      action: "assigned",
      old_status: null,
      new_status: "todo",
    }));
    historyRows.unshift({
      task_id: task.id,
      employee_id: null,
      action: "created",
      old_status: null,
      new_status: "todo",
    });
    await supabase.from("task_history").insert(historyRows);

    setShowForm(false);
    setForm(EMPTY_FORM);
    tasksState.reload();
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Create and manage tasks assigned to employees"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-44"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-40"
          value={githubFilter}
          onChange={(e) => setGithubFilter(e.target.value)}
        >
          <option value="all">GitHub: any</option>
          <option value="linked">Linked</option>
          <option value="notlinked">Not linked</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Overdue only
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {feedback && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>
      )}

      {tasksState.loading ? (
        <Spinner label="Loading tasks..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <Empty>No tasks found</Empty>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Assignee(s)</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">GitHub</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/tasks/${task.id}`} className="font-medium text-primary-600 hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {task.assignees.map((a) => (
                        <span key={a.employee_id}>
                          <Link
                            to={`/employees/${a.employee_id}`}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                          >
                            {a.employee?.name}
                          </Link>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {Array.from(
                      new Set(task.assignees.map((a) => a.employee?.department).filter(Boolean))
                    ).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.due_date ? (
                      <span className={isOverdue(task.status, task.due_date) ? "font-medium text-red-600" : ""}>
                        {formatDate(task.due_date)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.github_issue_url ? (
                      <a
                        href={task.github_issue_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        title={`Issue #${task.github_issue_id}`}
                      >
                        <GitBranch className="h-3.5 w-3.5 text-gray-400" />
                        #{task.github_issue_id}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(task.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating..." : "Create Task"}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <Input
            label="Task Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Prepare product presentation"
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional details..."
          />
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Assign to</span>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {employees.length === 0 && (
                <p className="px-2 py-1 text-sm text-gray-400">No active employees</p>
              )}
              {employees.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.employee_ids.includes(e.id)}
                    onChange={() => toggleAssignee(e.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="flex-1">
                    {e.name}
                    <span className="ml-2 text-xs text-gray-400">{e.department}</span>
                  </span>
                  {e.github_username && <GitBranch className="h-3 w-3 text-gray-400" />}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as TaskPriority })
              }
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Input
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.create_github_issue}
              onChange={(e) => setForm({ ...form, create_github_issue: e.target.checked })}
              className="rounded border-gray-300"
            />
            Create GitHub Issue?
          </label>
          {form.create_github_issue && (
            <p className="text-xs text-gray-400">
              A GitHub issue will be created for each listed assignee with a GitHub username linked.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}