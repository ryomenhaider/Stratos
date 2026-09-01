import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/State";
import { useEmployees, useTasks } from "@/hooks/useData";
import {
  buildCompletionOverTime,
  buildDepartmentChart,
  buildEmployeeChart,
  buildStatusDistribution,
  computeDepartmentAnalytics,
  computeEmployeeAnalytics,
} from "@/lib/analytics";
import { avgCompletionTime } from "@/lib/utils";

const PIE_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#ef4444"];

export default function Analytics() {
  const employeesState = useEmployees();
  const tasksState = useTasks();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [sortBy, setSortBy] = useState<"rate" | "assigned" | "overdue">("assigned");

  const data = useMemo(() => {
    const tasks = tasksState.data ?? [];
    const employees = employeesState.data ?? [];

    const timeSeries = buildCompletionOverTime(tasks, period === "month" ? "month" : "week");
    const employeeRows = computeEmployeeAnalytics(employees, tasks);
    const departmentRows = computeDepartmentAnalytics(tasks);

    const sortedEmployees = [...employeeRows].sort((a, b) => {
      if (sortBy === "rate") return b.completionRate - a.completionRate;
      if (sortBy === "overdue") return b.overdue - a.overdue;
      return b.assigned - a.assigned;
    });

    return {
      timeSeries,
      employeeRows,
      departmentRows,
      sortedEmployees,
      employeeChart: buildEmployeeChart(employeeRows),
      departmentChart: buildDepartmentChart(departmentRows),
      statusDistribution: buildStatusDistribution(tasks),
    };
  }, [tasksState.data, employeesState.data, period, sortBy]);

  if (tasksState.loading || employeesState.loading) {
    return <Spinner label="Loading analytics..." />;
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Task metrics by employee and department"
        action={
          <Select
            className="w-36"
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tasks over Time" subtitle="Created vs completed" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status Distribution" subtitle="All tasks by status" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.statusDistribution.map((d) => (
                    <Cell key={d.name} fill={PIE_COLORS[data.statusDistribution.indexOf(d) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tasks by Employee"
            subtitle="Assigned vs completed (top 15)"
          />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.employeeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assigned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tasks by Department" subtitle="Workload distribution" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.departmentChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Employee Analytics</h2>
          <Select className="w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="assigned">Sort by assigned</option>
            <option value="rate">Sort by completion rate</option>
            <option value="overdue">Sort by overdue</option>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Overdue</th>
                <th className="px-4 py-3 font-medium">Completion Rate</th>
                <th className="px-4 py-3 font-medium">Avg Completion Time</th>
              </tr>
            </thead>
            <tbody>
              {data.sortedEmployees.map((r) => (
                <tr key={r.employee.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.employee.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.assigned}</td>
                  <td className="px-4 py-3 text-gray-600">{r.completed}</td>
                  <td className="px-4 py-3 text-gray-600">{r.pending}</td>
                  <td className="px-4 py-3 text-gray-600">{r.overdue}</td>
                  <td className="px-4 py-3 text-gray-600">{r.completionRate}%</td>
                  <td className="px-4 py-3 text-gray-600">
                    {avgCompletionTime(r.avgCompletionMs ? [r.avgCompletionMs] : []) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Department Analytics</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Tasks</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Overdue</th>
                <th className="px-4 py-3 font-medium">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.departmentRows.map((r) => (
                <tr key={r.department} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.department}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total}</td>
                  <td className="px-4 py-3 text-gray-600">{r.completed}</td>
                  <td className="px-4 py-3 text-gray-600">{r.pending}</td>
                  <td className="px-4 py-3 text-gray-600">{r.overdue}</td>
                  <td className="px-4 py-3 text-gray-600">{r.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}