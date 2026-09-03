import {
  bodyOf,
  completionHref,
  corsHeaders,
  corsJson,
  nowIso,
  randomToken,
  sendEmail,
  serviceClient,
  sha256,
  APP_URL,
} from "../_shared/helpers.ts";
import { rejectionEmail } from "../_shared/templates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return corsJson({ ok: false, message: "Method not allowed" }, 405);
  }

  const { taskId, decision, rejectionReason, adminEmail } = await bodyOf(req);

  if (typeof taskId !== "string" || !taskId) {
    return corsJson({ ok: false, message: "Missing task id." }, 400);
  }
  if (decision !== "approved" && decision !== "rejected") {
    return corsJson({ ok: false, message: "Decision must be approved or rejected." }, 400);
  }

  const supabase = serviceClient();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) return corsJson({ ok: false, message: "Internal error." }, 500);
  if (!task) return corsJson({ ok: false, message: "Task not found." }, 404);

  // Latest submission awaiting review.
  const { data: proof } = await supabase
    .from("task_proofs")
    .select("id, employee_id, reviewed")
    .eq("task_id", taskId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = nowIso().toISOString();
  // Reviewed_by references the employees table; resolve the admin's employee id
  // from their auth email, if such an employee exists.
  let reviewedBy: string | null = null;
  if (typeof adminEmail === "string" && adminEmail) {
    const { data: adminEmp } = await supabase
      .from("employees")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle();
    if (adminEmp) reviewedBy = adminEmp.id;
  }

  if (decision === "approved") {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: now,
        completed_by: proof?.employee_id ?? null,
        updated_at: now,
      })
      .eq("id", taskId)
      .in("status", ["pending_approval"]);
    if (updateError) return corsJson({ ok: false, message: "Could not approve task." }, 500);

    if (proof?.id) {
      await supabase
        .from("task_proofs")
        .update({
          reviewed: true,
          review_decision: "approved",
          reviewed_at: now,
          reviewed_by: reviewedBy,
        })
        .eq("id", proof.id);
    }

    await supabase.from("task_history").insert({
      task_id: taskId,
      employee_id: proof?.employee_id ?? null,
      action: "approved",
      old_status: task.status,
      new_status: "completed",
    });

    return corsJson({ ok: true, message: "Task approved and completed." });
  }

  // ---- Reject ----
  const { error: rejectError } = await supabase
    .from("tasks")
    .update({ status: "in_progress", updated_at: now })
    .eq("id", taskId)
    .in("status", ["pending_approval"]);
  if (rejectError) return corsJson({ ok: false, message: "Could not reject task." }, 500);

  if (proof?.id) {
    await supabase
      .from("task_proofs")
      .update({
        reviewed: true,
        review_decision: "rejected",
        rejection_reason: typeof rejectionReason === "string" && rejectionReason.trim() ? rejectionReason.trim() : null,
        reviewed_at: now,
        reviewed_by: reviewedBy,
      })
      .eq("id", proof.id);
  }

  await supabase.from("task_history").insert({
    task_id: taskId,
    employee_id: proof?.employee_id ?? null,
    action: "rejected",
    old_status: task.status,
    new_status: "in_progress",
  });

  // Generate a fresh completion link and email it to the employee so they can resubmit.
  const employeeId = proof?.employee_id ?? null;
  let emailSent = false;
  let emailError: string | null = null;

  if (employeeId) {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, email")
      .eq("id", employeeId)
      .maybeSingle();

    if (employee?.email && APP_URL) {
      const token = randomToken();
      const hash = await sha256(token);
      const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await supabase.from("email_action_tokens").insert({
        task_id: taskId,
        employee_id: employee.id,
        token_hash: hash,
        action: "complete_task",
        expires_at: deadline.toISOString(),
      });

      const { data: settings } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      const fromEmail = settings?.from_email ?? null;

      const firstName = employee.name.split(" ")[0];
      const reason = typeof rejectionReason === "string" && rejectionReason.trim() ? rejectionReason.trim() : "";
      const html = rejectionEmail(firstName, task.title, reason, completionHref(token));
      const res = await sendEmail(employee.email, "Your task submission needs revision", html, fromEmail ?? undefined);

      await supabase.from("email_logs").insert({
        employee_id: employee.id,
        task_id: taskId,
        automation_id: null,
        email_type: "rejection",
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.messageId ?? null,
        error: res.error ?? null,
        dedupe_key: null,
      });

      emailSent = res.ok;
      emailError = res.error ?? null;
    }
  }

  return corsJson({
    ok: true,
    message: emailSent
      ? "Task rejected. A resubmission link was sent to the employee."
      : "Task rejected back to In Progress.",
    emailSent,
    emailError,
  });
});
