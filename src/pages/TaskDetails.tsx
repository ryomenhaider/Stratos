import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner, Empty } from "@/components/ui/State";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useEmployees, useTask, useTaskHistory } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { TaskStatus, TaskWithRelations } from "@/types";

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const taskState = useTask(id);
  const historyState = useTaskHistory(id);
  const employeesState = useEmployees();

  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [desc, setDesc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (taskState.loading) return <Spinner label="Loading task..." />;

  if (!taskState.data) {
    return (
      <div>
        <PageHeader title="Task not found" />
        <Link to="/tasks">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to tasks
          </Button>
        </Link>
      </div>
    );
  }

  const task = taskState.data as unknown as TaskWithRelations;

  const employees = employeesState.data ?? [];

  async function saveStatus(next: TaskStatus) {
    const old = task.status;
    if (next === old) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    const patch: Partial<Record<string, unknown>> = { status: next };
    if (next === "completed") {
      patch.completed_at = new Date().toISOString();
      patch.completed_by = null;
    } else {
      patch.completed_at = null;
      patch.completed_by = null;
    }
    const { error: err } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    await supabase.from("task_history").insert({
      task_id: task.id,
      employee_id: null,
      action: next === "completed" ? "completed" : next === "cancelled" ? "cancelled" : "started",
      old_status: old,
      new_status: next,
    });
    setStatus(next);
    setFeedback(`Task status updated to "${next}".`);
    setSaving(false);
    taskState.reload();
    historyState.reload();
  }

  async function handleResolveCompletedBy(employeeId: string | null) {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("tasks")
      .update({ completed_by: employeeId })
      .eq("id", task.id);
    setSaving(false);
    if (err) setError(err.message);
    else taskState.reload();
  }

  async function saveDescription() {
    if (desc === null) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("tasks")
      .update({ description: desc?.trim() || null })
      .eq("id", task.id);
    setSaving(false);
    if (err) setError(err.message);
    else {
      setFeedback("Description saved.");
      taskState.reload();
    }
  }

  const history = historyState.data ?? [];

  return (
    <div>
      <PageHeader
        title={task.title}
        subtitle={`Created ${formatDateTime(task.created_at)}`}
        action={
          <Link to="/tasks">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {feedback && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>
              <Textarea
                rows={4}
                value={desc ?? task.description ?? ""}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="No description provided."
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={saveDescription} disabled={saving || desc === null}>
                  Save Description
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assignees" subtitle="Employees assigned to this task" />
            <CardBody>
              <div className="space-y-2">
                {task.assignees.length === 0 && <Empty>No assignees</Empty>}
                {task.assignees.map((a) => (
                  <div key={a.employee_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {a.employee?.name?.[0]}
                      </div>
                      <div>
                        <Link to={`/employees/${a.employee_id}`} className="text-sm font-medium text-primary-600 hover:underline">
                          {a.employee?.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {a.employee?.department} • {a.employee?.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" subtitle="Task events" />
            <CardBody className="p-0">
              <div className="divide-y divide-gray-50">
                {history.length === 0 && (
                  <div className="px-5 py-6 text-center text-gray-400">No events recorded</div>
                )}
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <span className="text-[10px] font-bold uppercase text-gray-500">
                        {h.action.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-800">{h.action.replace(/_/g, " ")}</span>
                      <span className="text-gray-400">
                        {" "}
                        {h.new_status && `→ ${h.new_status.replace(/_/g, " ")}`}
                        {h.employee?.name ? ` · ${h.employee.name}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(h.timestamp)}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <div>
                <span className="mb-1 block text-xs text-gray-500">Status</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status ?? task.status} />
                  <Select
                    className="w-36"
                    value={status ?? task.status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  {status && status !== task.status && (
                    <Button size="sm" onClick={() => saveStatus(status)} disabled={saving}>
                      Update
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Priority</span>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Due date</span>
                <span className="text-sm text-gray-700">{formatDate(task.due_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Created</span>
                <span className="text-sm text-gray-700">{formatDateTime(task.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Completed at</span>
                <span className="text-sm text-gray-700">{formatDateTime(task.completed_at)}</span>
              </div>
              <div>
                <span className="mb-1 block text-xs text-gray-500">Completed by</span>
                <div className="flex items-center gap-2">
                  {task.completed_by_employee ? (
                    <Badge className="bg-green-100 text-green-700">
                      {task.completed_by_employee.name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">Not completed</span>
                  )}
                  {task.status === "completed" && (
                    <Select
                      className="w-36"
                      defaultValue={task.completed_by_employee?.id ?? "unassigned"}
                      onChange={(e) => handleResolveCompletedBy(e.target.value === "unassigned" ? null : e.target.value)}
                    >
                      <option value="unassigned">Unknown</option>
                      {task.assignees
                        .map((a) => a.employee)
                        .filter((e): e is NonNullable<typeof e> => !!e)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </Select>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="GitHub Issue" />
            <CardBody>
              {task.github_issue_url ? (
                <a
                  href={task.github_issue_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary-600 hover:underline"
                >
                  <GitBranch className="h-4 w-4" />
                  Issue #{task.github_issue_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm text-gray-400">No GitHub issue linked.</p>
              )}
              <div className="mt-3">
                <Select
                  className="w-full"
                  defaultValue=""
                  disabled={employees.length === 0}
                  onChange={async (e) => {
                    if (!e.target.value) return;
                    const eid = e.target.value;
                    const emp = employees.find((x) => x.id === eid);
                    if (!emp) return;
                    const { data, error: err } = await supabase.functions.invoke(
                      "create-github-issue",
                      { body: JSON.stringify({ title: task.title, body: task.description ?? "" }) }
                    );
                    if (!err && data?.issue_id) {
                      await supabase
                        .from("tasks")
                        .update({
                          github_issue_id: data.issue_id,
                          github_issue_url: data.issue_url,
                        })
                        .eq("id", task.id);
                      taskState.reload();
                    }
                  }}
                >
                  <option value="">Create issue...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
                {employees.every((e) => !e.github_username) && (
                  <p className="mt-1 text-xs text-gray-400">
                    No employees have a GitHub username configured.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}