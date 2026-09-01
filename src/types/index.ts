export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  github_username: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
  github_issue_id: number | null;
  github_issue_url: string | null;
}

export interface TaskAssigneeRow {
  task_id: string;
  employee_id: string;
  assigned_at: string;
}

export interface TaskWithRelations extends Task {
  assignees: {
    employee_id: string;
    assigned_at: string;
    employee: Pick<
      Employee,
      "id" | "name" | "email" | "department" | "role" | "github_username" | "active"
    > | null;
  }[];
  completed_by_employee: Pick<
    Employee,
    "id" | "name" | "email" | "department" | "role" | "github_username" | "active"
  > | null;
  created_by_employee: Pick<
    Employee,
    "id" | "name" | "email" | "department" | "role" | "github_username" | "active"
  > | null;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  employee_id: string | null;
  action: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus | null;
  timestamp: string;
  employee?: Pick<Employee, "id" | "name" | "email"> | null;
}

export interface Automation {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  time: string | null;
  timezone: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  emails_sent: number;
  emails_failed: number;
  error: string | null;
  automation?: Pick<Automation, "id" | "name" | "type"> | null;
}

export interface EmailLog {
  id: string;
  employee_id: string | null;
  task_id: string | null;
  automation_id: string | null;
  email_type: string;
  sent_at: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  employee?: Pick<Employee, "id" | "name" | "email"> | null;
}

export interface Settings {
  id: string;
  timezone: string;
  daily_email_time: string;
  from_email: string;
  github_repo: string | null;
  weekly_report_recipient: string | null;
  updated_at: string;
}
