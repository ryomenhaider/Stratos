import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitBranch, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/Badges";
import { Spinner } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { useEmployees, useTasks } from "@/hooks/useData";
import { formatDate } from "@/lib/utils";
import { computeEmployeeAnalytics } from "@/lib/analytics";

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const employeesState = useEmployees();
  const tasksState = useTasks();

  if (employeesState.loading || tasksState.loading) {
    return <Spinner label="Loading..." />;
  }

  const employees = employeesState.data ?? [];
  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <div>
        <PageHeader title="Employee not found" />
        <Link to="/employees">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to employees
          </Button>
        </Link>
      </div>
    );
  }

  const tasks = tasksState.data ?? [];
  const row = computeEmployeeAnalytics(employees, tasks).find((r) => r.employee.id === id);
  const employeeTasks = tasks.filter((t) =>
    t.assignees.some((a) => a.employee_id === employee.id)
  );

  return (
    <div>
      <PageHeader
        title={employee.name}
        subtitle={`${employee.role} • ${employee.department}`}
        action={
          <Link to="/employees">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                {employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{employee.name}</h2>
                <p className="text-sm text-gray-500">{employee.role}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <span className="text-gray-700">{employee.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-500">
                  <GitBranch className="h-4 w-4" /> GitHub
                </span>
                <span className="text-gray-700">
                  {employee.github_username ? (
                    <a
                      href={`https://github.com/${employee.github_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      @{employee.github_username}
                    </a>
                  ) : (
                    "None"
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                {employee.active ? (
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Joined</span>
                <span className="text-gray-700">{formatDate(employee.created_at)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Card>
              <CardBody>
                <p className="text-xs text-gray-500">Assigned</p>
                <p className="text-2xl font-bold">{row?.assigned ?? 0}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{row?.completed ?? 0}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{row?.pending ?? 0}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{row?.overdue ?? 0}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold">{row?.completionRate ?? 0}%</p>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold">Tasks</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-medium">Task</th>
                    <th className="px-5 py-3 font-medium">Priority</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeTasks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                        No tasks assigned
                      </td>
                    </tr>
                  )}
                  {employeeTasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <Link to={`/tasks/${task.id}`} className="text-primary-600 hover:underline">
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 capitalize text-gray-600">{task.priority}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(task.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}