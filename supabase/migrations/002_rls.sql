-- ## RLS policies
-- Only the authenticated admin (Supabase Auth) can access dashboard data.
-- Edge functions use the service role and bypass RLS.

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_history enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_action_tokens enable row level security;
alter table public.settings enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'public.departments',
    'public.employees',
    'public.tasks',
    'public.task_assignees',
    'public.task_history',
    'public.automations',
    'public.automation_runs',
    'public.email_logs',
    'public.email_action_tokens',
    'public.settings'
  ]
  loop
    execute format('create policy "admin_full_access_%s" on %s to authenticated using (true) with check (true);', table_name, table_name);
  end loop;
end $$;
