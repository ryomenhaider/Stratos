import { useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Empty, Spinner } from "@/components/ui/State";
import { useDepartments, useEmployees, useTasks } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/types";
import { computeEmployeeAnalytics } from "@/lib/analytics";

const EMPTY_FORM = {
  name: "",
  email: "",
  department: "",
  role: "",
  github_username: "",
};

export default function Employees() {
  const employeesState = useEmployees();
  const departmentsState = useDepartments();
  const tasksState = useTasks();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const departments = departmentsState.data ?? [];
  const analystics = computeEmployeeAnalytics(
    employeesState.data ?? [],
    tasksState.data ?? []
  );

  const filtered = analystics.filter((row) => {
    const e = row.employee;
    if (deptFilter && e.department !== deptFilter) return false;
    if (
      search &&
      !`${e.name} ${e.email} ${e.department} ${e.role}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  function openAdd() {
    setEditing(null);
    setForm(
      departments.length > 0
        ? { ...EMPTY_FORM, department: departments[0].name }
        : EMPTY_FORM
    );
    setError(null);
    setShowForm(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      name: e.name,
      email: e.email,
      department: e.department,
      role: e.role,
      github_username: e.github_username ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department.trim(),
      role: form.role.trim(),
      github_username: form.github_username.trim() || null,
    };
    if (!payload.name || !payload.email || !payload.department || !payload.role) {
      setError("All fields are required.");
      setSaving(false);
      return;
    }

    const { error: err } = editing
      ? await supabase.from("employees").update(payload).eq("id", editing.id)
      : await supabase.from("employees").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    employeesState.reload();
  }

  async function toggleActive(e: Employee) {
    const { error: err } = await supabase
      .from("employees")
      .update({ active: !e.active })
      .eq("id", e.id);
    if (!err) employeesState.reload();
  }

  async function removeEmployee(e: Employee) {
    const hasHistory = analystics.find((r) => r.employee.id === e.id)?.assigned ?? 0;
    if (hasHistory > 0) {
      setError(
        "Cannot delete an employee with task history. Deactivate instead to preserve task analytics."
      );
      return;
    }
    if (!window.confirm(`Delete ${e.name}? This cannot be undone.`)) return;
    const { error: err } = await supabase.from("employees").delete().eq("id", e.id);
    if (!err) employeesState.reload();
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage employees who receive task emails"
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-48"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {employeesState.loading || tasksState.loading ? (
        <Spinner label="Loading employees..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <Empty>
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No employees found
          </Empty>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">GitHub</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Tasks</th>
                <th className="px-4 py-3 font-medium">Completion Rate</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ employee, assigned, completionRate }) => (
                <tr key={employee.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${employee.id}`} className="font-medium text-primary-600 hover:underline">
                      {employee.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{employee.email}</td>
                  <td className="px-4 py-3 text-gray-600">{employee.department}</td>
                  <td className="px-4 py-3 text-gray-600">{employee.role}</td>
                  <td className="px-4 py-3">
                    {employee.github_username ? (
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <GitBranch className="h-3.5 w-3.5 text-gray-400" />
                        {employee.github_username}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {employee.active ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{assigned}</td>
                  <td className="px-4 py-3 text-gray-600">{completionRate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(employee)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!employee.active && (
                        <button
                          onClick={() => toggleActive(employee)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Re-activate"
                        >
                          <Badge className="bg-green-50 text-green-600">Reactivate</Badge>
                        </button>
                      )}
                      <button
                        onClick={() => removeEmployee(employee)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Employee" : "Add Employee"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Employee"}
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ahmed Ali"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ahmed@company.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Engineering"
            />
            <Input
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Developer"
            />
          </div>
          <Input
            label="GitHub Username (optional)"
            value={form.github_username}
            onChange={(e) => setForm({ ...form, github_username: e.target.value })}
            placeholder="ahmed123"
          />
        </form>
      </Modal>
    </div>
  );
}