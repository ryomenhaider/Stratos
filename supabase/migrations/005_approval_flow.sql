-- Add approval flow: new task status + proof submissions table.

-- New status sits between in_progress and completed. The task is not done
-- until the admin reviews the submitted proof and approves it.
alter type public.task_status add value 'pending_approval';

-- Proof submitted by an employee when they click the completion link.
create table if not exists public.task_proofs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  pr_url text,
  note text,
  reviewed boolean not null default false,
  review_decision text,          -- NULL | 'approved' | 'rejected'
  rejection_reason text,         -- admin's reason, sent back to the employee
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.employees (id) on delete set null
);

create index if not exists task_proofs_task_id_idx on public.task_proofs (task_id);
create index if not exists task_proofs_employee_id_idx on public.task_proofs (employee_id);

-- RLS: admin (authenticated) full access, matching the existing pattern.
alter table public.task_proofs enable row level security;

create policy "admin_full_access_task_proofs" on public.task_proofs
  to authenticated using (true) with check (true);
