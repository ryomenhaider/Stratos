import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Clock3,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { Spinner } from "@/components/ui/State";
import { PageHeader } from "@/components/PageHeader";
import { useEmployees, useTasks } from "@/hooks/useData";
import { computeTaskStats } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

export default function Dashboard() {
  const employeesState = useEmployees();
  const tasksState = useTasks();

  if (tasksState.loading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Overview of your team's tasks" />
        <Spinner label="Loading..." />
      </div>
    );
  }

  const tasks = tasksState.data ?? [];
  const employees = employeesState.data ?? [];
  const activeEmployees = employees.filter((e) => e.active);
  const stats = computeTaskStats(tasks);
  const pendingTasks = tasks
    .filter((t) => t.status === "pending_approval")
    .sort((a, b) => (a.proof?.submitted_at ?? "").localeCompare(b.proof?.submitted_at ?? ""));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your team and tasks" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Employees"
          value={activeEmployees.length}
          icon={Users}
          tone="blue"
          sub={`${employees.length} total`}
        />
        <StatCard label="Total Tasks" value={stats.total} icon={CircleDashed} />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          tone="green"
          sub={`${stats.completionRate}% completion rate`}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          tone="red"
          sub={`${stats.pending} pending`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">To Do</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats.todo}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats.inProgress}</p>
        </div>
        <StatCard
          label="Pending Approval"
          value={stats.pendingApproval}
          icon={Clock3}
          tone="default"
          sub="awaiting review"
        />
      </div>

      {pendingTasks.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Pending Approvals ({pendingTasks.length})
            </h2>
          </div>
          <ul className="mt-3 divide-y divide-amber-100">
            {pendingTasks.map((t) => {
              const submitter = t.proof?.employee?.name ?? "Unknown";
              return (
                <li key={t.id}>
                  <Link
                    to={`/tasks/${t.id}`}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-amber-700">
                        {submitter}
                        {t.proof?.submitted_at
                          ? ` · ${formatDate(t.proof.submitted_at)}`
                          : ""}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-primary-600">
                      View Task →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}