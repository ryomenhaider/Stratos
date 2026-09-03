# Stratos — Employee Task & Email Management Dashboard

A lightweight internal task management system for a **single administrator**.

- **Employees never log in.** They interact with the system purely through email.
- **The administrator** manages employees, creates and assigns tasks, configures automations, reviews analytics, and optionally connects tasks to GitHub issues.
- **GitHub is optional.** The system works perfectly for employees without GitHub.

```
Admin Dashboard → Supabase (employees, tasks, history, automations, email logs)
                       ├── GitHub (optional issues)
                       └── Resend (email) → Employees
```

## Hosting

| Component | Service |
|---|---|
| Frontend | Vercel (React SPA, no backend server) |
| Database + Auth | Supabase PostgreSQL (admin-only) |
| Scheduled automation | GitHub Actions |
| Email delivery | Resend |
| Server-side secrets | Supabase Edge Functions |

There is no traditional backend. The frontend talks to Supabase directly. Operations that require secrets (email sending, GitHub issues, task completion) run in Supabase Edge Functions.

---

## Architecture

```
Admin Dashboard
      │
      ▼
   Supabase
      ├── employees
      ├── tasks
      ├── task_assignees
      ├── task_history
      ├── automations
      ├── automation_runs
      ├── email_logs
      ├── email_action_tokens
      └── settings
      │
      ├───────────────┐
      ▼               ▼
GitHub             Resend
(optional)          Email → Employees
```

**One administrator** operates the dashboard. Employees simply receive email and may click a secure one-time link to mark a task complete.

---

## Project structure

```
.
├── .github/workflows/
│   └── automations.yml      # Scheduled + manual (workflow_dispatch) automation
├── scripts/
│   ├── requirements.txt
│   └── run_automation.py    # Thin trigger that calls the run-automation edge function
├── supabase/
│   ├── config.toml
│   ├── migrations/          # SQL schema, RLS, seed (apply in order 001, 002, 003)
│   └── functions/
│       ├── _shared/         # helpers and email templates
│       ├── run-automation/  # Daily tasks / overdue / weekly emails
│       ├── complete-task/   # Secure one-time task completion
│       └── create-github-issue/
├── src/                     # React + TS frontend
│   ├── lib/                 # supabase client, utils, analytics, constants
│   ├── hooks/               # data-fetching hooks
│   ├── context/             # auth context
│   ├── components/          # layout, UI primitives
│   └── pages/               # dashboard, tasks, employees, analytics, ...
├── tests/                   # Vitest unit tests
├── vercel.json              # Vercel SPA rewrite config
├── index.html
├── vite.config.ts
└── package.json
```

---

## Quick start

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_seed.sql`
3. Add the first **admin user** (single admin): **Authentication → Users → Add user**, with email + password.
4. Deploy the **Edge Functions**:
   ```bash
   npx supabase functions deploy run-automation
   npx supabase functions deploy complete-task
   npx supabase functions deploy create-github-issue
   ```
5. Set function secrets:
   ```bash
   npx supabase secrets set SUPABASE_URL=... \
     SUPABASE_SERVICE_ROLE_KEY=... \
     RESEND_API_KEY=... \
     APP_URL=https://<your-app>.vercel.app \
     FROM_EMAIL=tasks@yourdomain.com \
     GITHUB_TOKEN=...          # optional, only for GitHub issues
   ```

> Edge functions are deployed with `verify_jwt = false` so employees can open completion links without an account.

### 2. Frontend

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Only two variables are safe for the browser — the anon key and the project URL. Never put service-role or Resend keys in the frontend.

### 3. GitHub Actions secrets

For the automated emails to run on a schedule, add these repo secrets:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

(RESEND_API_KEY and FROM_EMAIL are used by the edge functions; they can also be passed as GitHub secrets that the Python script forwards — the included workflow relies on the edge functions and only needs the two Supabase secrets.)

### 4. Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects Vite. Use these settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add these **Environment Variables** in the Vercel dashboard:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Deploy. Vercel provides a `*.vercel.app` URL.

The `vercel.json` configures SPA rewrites so all routes serve `index.html`.

---

## How it works

### Task creation (one shared task, multiple assignees)

The admin creates a task, selects multiple employees, sets priority/due date, and optionally enables GitHub issue creation.

- **With GitHub**: a GitHub issue is created via the `create-github-issue` edge function for the configured repository, and `github_issue_id`/`github_issue_url` are saved on the task. Issue creation is per-task (not per-employee).
- **Without GitHub or without a GitHub username**: it is a normal dashboard task; the employee is emailed.

### Daily emails

Every day at the configured time (default `08:00 Asia/Karachi`) the `run-automation` edge function (triggered by GitHub Actions) does:

```
Find employees → find tasks due today → generate email → send via Resend
```

Notes:

- If an employee has no tasks that day, **no empty email is sent**.
- Deduplication: a `dedupe_key` (`daily_tasks:<employee>:<date>`) is recorded in `email_logs`, so the same email is never sent twice for the same employee/date.
- The admin can **Run now** from the dashboard or trigger the workflow manually (`workflow_dispatch`) in GitHub Actions.

### Overdue reminders

An employee with overdue tasks receives a reminder at the configured time. Same dedupe rules apply.

### Weekly summaries & admin report

- **Weekly Employee Summary**: each employee gets assigned/completed/pending/overdue counts for the week.
- **Weekly Admin Report**: the configured recipient gets a company-wide report with totals and the top completion rates.

### Marking a task complete from email

Each task card includes a **MARK COMPLETE** button linking to `https://<app>/c/<token>`.

- A random, cryptographically strong token is generated per `(task, employee)`.
- Only its **SHA-256 hash** is stored in `email_action_tokens`.
- The token is **single-use** and **expires** after 14 days.
- The `complete-task` edge function validates token → task → employee → action → expiration → used status before marking the task complete.
- The first assignee to click completes the shared task (`status = completed`, `completed_at`, `completed_by`); the event is recorded in `task_history`.
- Completion links are **not** auth sessions — they grant only that single action for that single task/assignee.

---

## Security model

| Concern | How it's handled |
|---|---|
| Admin-only dashboard | Supabase Auth; RLS grants access only to authenticated users |
| No employee accounts | Employees never authenticate anywhere |
| Service-role / Resend keys | Only inside Edge Functions and GitHub Actions secrets — never in the frontend |
| One-time completion links | Random token, hashed at rest, single-use, expiring, scoped to one task + employee |
| Delete protection | An employee with task history cannot be deleted (deactivate instead) |

RLS is enabled on every table and is enforced for browser (anon/authenticated) requests. Edge functions use the service role and bypass RLS intentionally.

---

## Database schema

Tables: `employees`, `departments`, `tasks`, `task_assignees`, `task_history`, `automations`, `automation_runs`, `email_logs`, `email_action_tokens`, `settings`.

Key indexes:
- `tasks(status)`, `tasks(due_date)`, `tasks(created_at)`
- `task_assignees(employee_id)`
- `email_logs(employee_id)`, `email_logs(sent_at)`, unique `email_logs(dedupe_key)`
- `email_action_tokens(token_hash)` unique

Automation types: `daily_tasks`, `overdue_reminder`, `weekly_employee_summary`, `weekly_admin_report`.

---

## Local development

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | oxlint |
| `npm test` | Vitest unit tests |

### Testing the automation locally

You can call the edge function directly:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/run-automation" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type": "daily_tasks" }'
```

Or run the Python trigger:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  python3 scripts/run_automation.py daily_tasks overdue_reminder
```

---

## Configuration notes

- Default timezone is `Asia/Karachi` (also the default in GitHub Actions cron, commented for clarity).
- `automations` are seeded for all four types.
- The `settings` singleton holds: `timezone`, `daily_email_time`, `from_email`, `github_repo`, `weekly_report_recipient`.
- The GitHub page and Settings page both let you set the repository used for issues.

---

## Limitations / scope

- Single admin — no RBAC, no employee-facing UI, no employee accounts.
- GitHub issue creation is per-task and repository-level (employees do not need GitHub accounts).
- Email sending requires a verified Resend sender domain.
