import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Spinner } from "@/components/ui/State";
import { PageHeader } from "@/components/PageHeader";
import { useEmployees, useTasks } from "@/hooks/useData";
import { computeTaskStats } from "@/lib/analytics";

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
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cancelled</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats.cancelled}</p>
        </div>
      </div>
    </div>
  );
}