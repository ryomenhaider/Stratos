import { bodyOf, corsHeaders, corsJson, serviceClient, sha256, nowIso } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return corsJson({ ok: false, message: "Method not allowed" }, 405);
  }

  const { token } = await bodyOf(req);
  if (typeof token !== "string" || !token) {
    return corsJson({ ok: false, message: "Missing token." }, 400);
  }

  const supabase = serviceClient();
  const tokenHash = await sha256(token);

  const { data: entry, error: lookupError } = await supabase
    .from("email_action_tokens")
    .select("id, task_id, employee_id, action, expires_at, used_at, created_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) {
    return corsJson({ ok: false, message: "Internal error." }, 500);
  }
  if (!entry) {
    return corsJson({ ok: false, message: "This link is invalid." }, 404);
  }
  if (entry.used_at) {
    return corsJson({ ok: false, message: "This link has already been used." }, 400);
  }
  if (entry.action !== "complete_task") {
    return corsJson({ ok: false, message: "This link is not a completion link." }, 400);
  }
  if (new Date(entry.expires_at).getTime() < nowIso().getTime()) {
    return corsJson({ ok: false, message: "This link has expired." }, 400);
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("id", entry.task_id)
    .maybeSingle();

  if (taskError) {
    return corsJson({ ok: false, message: "Internal error." }, 500);
  }
  if (!task) {
    return corsJson({ ok: false, message: "This task no longer exists." }, 404);
  }

  if (task.status === "completed") {
    await supabase
      .from("email_action_tokens")
      .update({ used_at: nowIso().toISOString() })
      .eq("id", entry.id);
    return corsJson({ ok: true, message: "Task already completed." });
  }

  const now = nowIso();
  const { data: updatedRows, error: updateError } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: now.toISOString(),
      completed_by: entry.employee_id,
      updated_at: now.toISOString(),
    })
    .eq("id", entry.task_id)
    .neq("status", "completed")
    .select("id");

  if (updateError) {
    return corsJson({ ok: false, message: "Could not complete the task." }, 500);
  }
  if (!updatedRows || updatedRows.length === 0) {
    await supabase
      .from("email_action_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", entry.id);
    return corsJson({ ok: true, message: "Task already completed." });
  }

  await supabase.from("task_history").insert({
    task_id: entry.task_id,
    employee_id: entry.employee_id,
    action: "completed",
    old_status: task.status,
    new_status: "completed",
  });

  await supabase
    .from("email_action_tokens")
    .update({ used_at: now.toISOString() })
    .eq("id", entry.id);

  return corsJson({ ok: true, message: "Task completed successfully." });
});