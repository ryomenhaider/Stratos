import {
  bodyOf,
  completionHref,
  corsHeaders,
  corsJson,
  dateKeyInTz,
  nowIso,
  randomToken,
  sendEmail,
  serviceClient,
  sha256,
  APP_URL,
} from "../_shared/helpers.ts";
import {
  adminReportEmail,
  dailyTaskEmail,
  overdueEmail,
  weeklySummaryEmail,
} from "../_shared/templates.ts";

const AUTOMATION_TYPES = new Set([
  "daily_tasks",
  "overdue_reminder",
  "weekly_employee_summary",
  "weekly_admin_report",
]);

type RunResult = {
  emailsSent: number;
  emailsFailed: number;
  error?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return corsJson({ ok: false, message: "Method not allowed" }, 405);
  }
  const { type } = await bodyOf(req);
  if (typeof type !== "string" || !AUTOMATION_TYPES.has(type)) {
    return corsJson({ ok: false, message: "Unknown automation type." }, 400);
  }

  if (!APP_URL) {
    return corsJson(
      { ok: false, message: "APP_URL is not configured. Completion links cannot be built." },
      500
    );
  }

  const supabase = serviceClient();

  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("type", type)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const timezone = automation?.timezone || settings?.timezone || "Asia/Karachi";
  const fromEmail = settings?.from_email || null;

  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      automation_id: automation?.id ?? null,
      started_at: nowIso().toISOString(),
      status: "running",
    })
    .select("id")
    .single();

  if (runError) {
    return corsJson({ ok: false, message: "Could not start run: " + runError.message }, 500);
  }

  let result: RunResult;
  try {
    switch (type) {
      case "daily_tasks":
        result = await runDailyTasks(supabase, timezone, fromEmail);
        break;
      case "overdue_reminder":
        result = await runOverdueReminder(supabase, timezone, fromEmail);
        break;
      case "weekly_employee_summary":
        result = await runWeeklyEmployeeSummary(supabase, timezone, fromEmail);
        break;
      case "weekly_admin_report":
        result = await runWeeklyAdminReport(
          supabase,
          settings?.weekly_report_recipient ?? null,
          timezone
        );
        break;
      default:
        result = { emailsSent: 0, emailsFailed: 0, error: "unreachable" };
    }
  } catch (err) {
    result = {
      emailsSent: 0,
      emailsFailed: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  await supabase
    .from("automation_runs")
    .update({
      status: result.error || result.emailsFailed > 0 ? "failed" : "success",
      completed_at: nowIso().toISOString(),
      emails_sent: result.emailsSent,
      emails_failed: result.emailsFailed,
      error:
        result.error ??
        (result.emailsFailed > 0
          ? `${result.emailsFailed} email(s) failed to send. Check email_logs for details.`
          : null),
    })
    .eq("id", run.id);

  if (result.error || result.emailsFailed > 0) {
    return corsJson(
      {
        ok: false,
        message:
          result.error ??
          `${result.emailsFailed} email(s) failed to send.`,
        emails_sent: result.emailsSent,
        emails_failed: result.emailsFailed,
      },
      500
    );
  }
  return corsJson({
    ok: true,
    status: "success",
    emails_sent: result.emailsSent,
    emails_failed: result.emailsFailed,
  });
});

async function runDailyTasks(
  supabase: ReturnType<typeof serviceClient>,
  timezone: string,
  fromEmail: string | null
): Promise<RunResult> {
  const today = dateKeyInTz(nowIso(), timezone);
  const dedicated = nowIso();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("due_date", today)
    .in("status", ["todo", "in_progress"]);

  if (error || !tasks || tasks.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  const ids = tasks.map((t) => t.id);
  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("task_id, employee_id")
    .in("task_id", ids);
  if (!assignees || assignees.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  const employeeIds = Array.from(new Set(assignees.map((a) => a.employee_id)));
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, email")
    .in("id", employeeIds)
    .eq("active", true);
  if (!employees || employees.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  const results = await Promise.all(
    employees.map(async (employee) => {
      const dedupeKey = `daily_tasks:${employee.id}:${today}`;
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .limit(1);
      if (existing && existing.length > 0) return null;

      const employeeTasks = tasks.filter((t) =>
        assignees.some((a) => a.task_id === t.id && a.employee_id === employee.id)
      );
      if (employeeTasks.length === 0) return null;

      const lines = await Promise.all(
        employeeTasks.map(async (task) => {
          const token = randomToken();
          const hash = await sha256(token);
          const deadline = new Date(dedicated.getTime() + 14 * 24 * 60 * 60 * 1000);
          await supabase.from("email_action_tokens").insert({
            task_id: task.id,
            employee_id: employee.id,
            token_hash: hash,
            action: "complete_task",
            expires_at: deadline.toISOString(),
          });
          return {
            title: task.title,
            priority: task.priority,
            dueDate: new Date(task.due_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            }),
            completionHref: completionHref(token),
          };
        })
      );

      const firstName = employee.name.split(" ")[0];
      const html = dailyTaskEmail(firstName, lines);
      const res = await sendEmail(employee.email, "Your tasks for today", html, fromEmail ?? undefined);

      await supabase.from("email_logs").insert({
        employee_id: employee.id,
        automation_id: null,
        email_type: "daily_tasks",
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.messageId ?? null,
        error: res.error ?? null,
        dedupe_key: res.ok ? dedupeKey : null,
      });
      return res.ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 };
    })
  );

  for (const r of results) {
    if (!r) continue;
    emailsSent += r.sent;
    emailsFailed += r.failed;
  }

  return { emailsSent, emailsFailed };
}

async function runOverdueReminder(
  supabase: ReturnType<typeof serviceClient>,
  timezone: string,
  fromEmail: string | null
): Promise<RunResult> {
  const today = dateKeyInTz(nowIso(), timezone);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("due_date", today)
    .in("status", ["todo", "in_progress"]);

  if (error || !tasks || tasks.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  const ids = tasks.map((t) => t.id);
  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("task_id, employee_id")
    .in("task_id", ids);
  if (!assignees || assignees.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  const employeeIds = Array.from(new Set(assignees.map((a) => a.employee_id)));
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, email")
    .in("id", employeeIds)
    .eq("active", true);
  if (!employees || employees.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  const results = await Promise.all(
    employees.map(async (employee) => {
      const employeeTasks = tasks.filter((t) =>
        assignees.some((a) => a.task_id === t.id && a.employee_id === employee.id)
      );
      if (employeeTasks.length === 0) return null;

      const dedupeKey = `overdue_reminder:${employee.id}:${today}`;
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .limit(1);
      if (existing && existing.length > 0) return null;

      const lines = await Promise.all(
        employeeTasks.map(async (task) => {
          const token = randomToken();
          const hash = await sha256(token);
          const deadline = new Date(nowIso().getTime() + 14 * 24 * 60 * 60 * 1000);
          await supabase.from("email_action_tokens").insert({
            task_id: task.id,
            employee_id: employee.id,
            token_hash: hash,
            action: "complete_task",
            expires_at: deadline.toISOString(),
          });
          return {
            title: task.title,
            dueDate: new Date(task.due_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            }),
            completionHref: completionHref(token),
          };
        })
      );

      const firstName = employee.name.split(" ")[0];
      const html = overdueEmail(firstName, lines);
      const res = await sendEmail(employee.email, "You have overdue tasks", html, fromEmail ?? undefined);

      await supabase.from("email_logs").insert({
        employee_id: employee.id,
        automation_id: null,
        email_type: "overdue_reminder",
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.messageId ?? null,
        error: res.error ?? null,
        dedupe_key: res.ok ? dedupeKey : null,
      });
      return res.ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 };
    })
  );

  for (const r of results) {
    if (!r) continue;
    emailsSent += r.sent;
    emailsFailed += r.failed;
  }

  return { emailsSent, emailsFailed };
}

async function runWeeklyEmployeeSummary(
  supabase: ReturnType<typeof serviceClient>,
  timezone: string,
  fromEmail: string | null
): Promise<RunResult> {
  const weekStartIso = startOfWeekIso(timezone);
  const today = dateKeyInTz(nowIso(), timezone);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, email")
    .eq("active", true);
  if (!employees || employees.length === 0) {
    return { emailsSent: 0, emailsFailed: 0 };
  }

  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("task_id, employee_id, task:tasks(*)")
    .gte("assigned_at", weekStartIso);
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select("id, completed_by, status, due_date")
    .eq("status", "completed")
    .gte("completed_at", weekStartIso);

  let emailsSent = 0;
  let emailsFailed = 0;

  const results = await Promise.all(
    employees.map(async (employee) => {
      const assigned = (assignments ?? []).filter((a) => a.employee_id === employee.id);
      const completed = (completedTasks ?? []).filter(
        (t) => t.completed_by === employee.id
      ).length;
      const overdue = assigned.filter(
        (a) =>
          a.task?.due_date &&
          a.task.due_date < today &&
          a.task.status !== "completed" &&
          a.task.status !== "cancelled"
      ).length;
      const pending = assigned.length - completed;

      const dedupeKey = `weekly_summary:${employee.id}:${weekStartIso.slice(0, 10)}`;
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .limit(1);
      if (existing && existing.length > 0) return null;

      const firstName = employee.name.split(" ")[0];
      const html = weeklySummaryEmail(firstName, assigned.length, completed, pending, overdue);
      const res = await sendEmail(
        employee.email,
        "Your weekly summary",
        html,
        fromEmail ?? undefined
      );

      await supabase.from("email_logs").insert({
        employee_id: employee.id,
        automation_id: null,
        email_type: "weekly_employee_summary",
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.messageId ?? null,
        error: res.error ?? null,
        dedupe_key: res.ok ? dedupeKey : null,
      });
      return res.ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 };
    })
  );

  for (const r of results) {
    if (!r) continue;
    emailsSent += r.sent;
    emailsFailed += r.failed;
  }

  return { emailsSent, emailsFailed };
}

async function runWeeklyAdminReport(
  supabase: ReturnType<typeof serviceClient>,
  recipient: string | null,
  timezone: string
): Promise<RunResult> {
  if (!recipient) {
    return { emailsSent: 0, emailsFailed: 0, error: "No weekly report recipient configured." };
  }

  const { data: tasks } = await supabase.from("tasks").select("status, due_date");
  const all = tasks ?? [];

  const completed = all.filter((t) => t.status === "completed").length;
  const cancelled = all.filter((t) => t.status === "cancelled").length;
  const pending = all.length - completed - cancelled;
  const today = dateKeyInTz(nowIso(), timezone);
  const overdue = all.filter(
    (t) => t.due_date && t.due_date < today && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  const { data: employees } = await supabase.from("employees").select("id, name").eq("active", true);
  const rates: { name: string; rate: number }[] = [];

  if (employees && employees.length > 0) {
    const empIds = employees.map((e) => e.id);
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("employee_id, task_id")
      .in("employee_id", empIds);
    const completedIds = new Set(all.filter((t) => t.status === "completed").map((t) => t.id));
    for (const emp of employees) {
      const assigned = (assignees ?? []).filter((a) => a.employee_id === emp.id).length;
      if (assigned === 0) continue;
      const done = (assignees ?? []).filter(
        (a) => a.employee_id === emp.id && completedIds.has(a.task_id)
      ).length;
      rates.push({ name: emp.name, rate: Math.round((done / assigned) * 100) });
    }
    rates.sort((a, b) => b.rate - a.rate);
  }

  const html = adminReportEmail(all.length, completed, pending, overdue, rates.slice(0, 10));
  const res = await sendEmail(recipient, "Weekly Employee Task Report", html, undefined);

  const dedupeKey = `admin_report:${new Date().toISOString().slice(0, 10)}`;
  await supabase.from("email_logs").insert({
    employee_id: null,
    automation_id: null,
    email_type: "weekly_admin_report",
    status: res.ok ? "sent" : "failed",
    provider_message_id: res.messageId ?? null,
    error: res.error ?? null,
    dedupe_key: res.ok ? dedupeKey : null,
  });

  return {
    emailsSent: res.ok ? 1 : 0,
    emailsFailed: res.ok ? 0 : 1,
  };
}

function startOfWeekIso(timezone: string): string {
  const now = nowIso();
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayAbbr = get("weekday");
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayAbbr);
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - weekday);
  return d.toISOString();
}