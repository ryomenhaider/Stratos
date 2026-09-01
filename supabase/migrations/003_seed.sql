-- ## Seed data
-- Default automations and a single settings row.

insert into public.automations (name, type, enabled, "time", timezone, config)
values
  ('Daily Task Email', 'daily_tasks', true, '08:00', 'Asia/Karachi', '{}'),
  ('Overdue Reminder', 'overdue_reminder', true, '17:00', 'Asia/Karachi', '{}'),
  ('Weekly Employee Summary', 'weekly_employee_summary', true, '09:00', 'Asia/Karachi', '{}'),
  ('Weekly Admin Report', 'weekly_admin_report', true, '18:00', 'Asia/Karachi', '{}')
on conflict (type) do nothing;

insert into public.settings (timezone, daily_email_time, from_email, github_repo)
values ('Asia/Karachi', '08:00', null, null)
on conflict do nothing;
