import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  CalendarCheck,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/automations", label: "Automations", icon: CalendarCheck },
  { to: "/github", label: "GitHub", icon: GitBranch },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">S</div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">Stratos</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-60 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
