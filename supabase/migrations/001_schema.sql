-- ## Stratos schema migration
-- Run from Supabase Dashboard > SQL Editor, or apply via CLI.

-- =====================================================
-- departments
-- =====================================================
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- =====================================================
-- employees
-- =====================================================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  department text not null,
  role text not null,
  github_username text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_department_idx on public.employees (department);
create index if not exists employees_active_idx on public.employees (active);

-- =====================================================
-- tasks
-- =====================================================
create type public.task_status as enum ('todo', 'in_progress', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.employees (id) on delete set null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.employees (id) on delete set null,
  github_issue_id bigint,
  github_issue_url text,
  constraint tasks_github_unique unique (github_issue_id)
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_created_at_idx on public.tasks (created_at);
create index if not exists tasks_priority_idx on public.tasks (priority);

-- =====================================================
-- task_assignees
-- =====================================================
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, employee_id)
);

create index if not exists task_assignees_employee_id_idx on public.task_assignees (employee_id);
create index if not exists task_assignees_task_id_idx on public.task_assignees (task_id);

-- =====================================================
-- task_history
-- =====================================================
create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  action text not null,
  old_status public.task_status,
  new_status public.task_status,
  timestamp timestamptz not null default now()
);

create index if not exists task_history_task_id_idx on public.task_history (task_id);
create index if not exists task_history_employee_id_idx on public.task_history (employee_id);

-- =====================================================
-- automations
-- =====================================================
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null unique,
  enabled boolean not null default true,
  time time not null default '08:00',
  timezone text not null default 'Asia/Karachi',
  config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- automation_runs
-- =====================================================
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references public.automations (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running', -- running | success | failed
  emails_sent integer not null default 0,
  emails_failed integer not null default 0,
  error text
);

create index if not exists automation_runs_started_at_idx on public.automation_runs (started_at);

-- =====================================================
-- email_logs
-- =====================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  automation_id uuid references public.automations (id) on delete set null,
  email_type text not null, -- daily_tasks | overdue_reminder | weekly_employee_summary | weekly_admin_report | task_assigned
  sent_at timestamptz not null default now(),
  status text not null default 'sent', -- sent | failed
  provider_message_id text,
  error text,
  dedupe_key text
);

create index if not exists email_logs_employee_id_idx on public.email_logs (employee_id);
create index if not exists email_logs_sent_at_idx on public.email_logs (sent_at);
create index if not exists email_logs_dedupe_key_idx on public.email_logs (dedupe_key);
create unique index if not exists email_logs_dedupe_unique on public.email_logs (dedupe_key) where dedupe_key is not null;

-- =====================================================
-- email_action_tokens
-- =====================================================
create table if not exists public.email_action_tokens (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  token_hash text not null unique,
  action text not null default 'complete_task',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_action_tokens_task_id_idx on public.email_action_tokens (task_id);
create index if not exists email_action_tokens_employee_id_idx on public.email_action_tokens (employee_id);

-- =====================================================
-- settings
-- =====================================================
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'Asia/Karachi',
  daily_email_time time not null default '08:00',
  from_email text,
  github_repo text,
  weekly_report_recipient text,
  updated_at timestamptz not null default now()
);
