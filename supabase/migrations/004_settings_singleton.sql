-- Enforce the `settings` table as a single-row singleton.
-- `create-github-issue` and `run-automation` read settings by id asc limit 1,
-- so duplicate rows would cause inconsistent config (e.g. a null from_email
-- shadowing the configured one). This index guarantees at most one row.
create unique index if not exists settings_singleton on public.settings ((true));
