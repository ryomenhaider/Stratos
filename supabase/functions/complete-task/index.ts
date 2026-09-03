import { bodyOf, corsHeaders, corsJson, serviceClient, sha256, nowIso } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return corsJson({ ok: false, message: "Method not allowed" }, 405);
  }

  const { token, prUrl, note } = await bodyOf(req);
  if (typeof token !== "string" || !token) {
    return corsJson({ ok: false, message: "Missing token." }, 400);
  }

  const hasProof =
    (typeof prUrl === "string" && prUrl.trim().length > 0) ||
    (typeof note === "string" && note.trim().length > 0);

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

  // Lookup-only call (no proof): validate the token and return task info so the
  // frontend can render a submission form. The token is NOT consumed here.
  if (!hasProof) {
    return corsJson({
      ok: true,
      lookup: true,
      task: { id: task.id, title: task.title, status: task.status },
    });
  }

  // Proof provided: submit for admin approval instead of completing directly.
  if (task.status === "completed") {
    await supabase
      .from("email_action_tokens")
      .update({ used_at: nowIso().toISOString() })
      .eq("id", entry.id);
    return corsJson({ ok: true, message: "Task is already completed." });
  }

  if (task.status === "cancelled") {
    return corsJson({ ok: false, message: "This task has been cancelled." }, 400);
  }

  const now = nowIso();
  const prUrlValue =
    typeof prUrl === "string" && prUrl.trim().length > 0 ? prUrl.trim() : null;
  const noteValue =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;

  const { error: proofError } = await supabase.from("task_proofs").insert({
    task_id: entry.task_id,
    employee_id: entry.employee_id,
    pr_url: prUrlValue,
    note: noteValue,
  });

  if (proofError) {
    return corsJson({ ok: false, message: "Could not save your submission." }, 500);
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: "pending_approval",
      updated_at: now.toISOString(),
    })
    .eq("id", entry.task_id)
    .in("status", ["todo", "in_progress", "pending_approval"]);

  if (updateError) {
    return corsJson({ ok: false, message: "Could not submit for approval." }, 500);
  }

  if (task.status !== "pending_approval") {
    await supabase.from("task_history").insert({
      task_id: entry.task_id,
      employee_id: entry.employee_id,
      action: "submitted_for_approval",
      old_status: task.status,
      new_status: "pending_approval",
    });
  }

  await supabase
    .from("email_action_tokens")
    .update({ used_at: now.toISOString() })
    .eq("id", entry.id);

  return corsJson({
    ok: true,
    message: "Proof submitted. Awaiting admin approval.",
  });
});
