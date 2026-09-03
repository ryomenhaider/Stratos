import { escapeHtml } from "./helpers.ts";

interface TaskLine {
  title: string;
  priority: string;
  dueDate: string | null;
  completionHref: string;
}

function priorityLabel(p: string): string {
  return { low: "LOW", medium: "MEDIUM", high: "HIGH", urgent: "URGENT" }[p] ?? p.toUpperCase();
}

function priorityColor(p: string): string {
  return {
    low: "#6b7280",
    medium: "#d97706",
    high: "#ea580c",
    urgent: "#dc2626",
  }[p] ?? "#6b7280";
}

export function baseEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;background-color:#4f46e5;">
              <span style="color:#ffffff;font-size:20px;font-weight:bold;">Stratos</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#111827;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
              You're receiving this because your team uses Stratos. You can mark tasks complete directly from the buttons above — no account needed.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function taskCard(task: TaskLine): string {
  const pLabel = priorityLabel(task.priority);
  const pColor = priorityColor(task.priority);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="padding:16px 20px;">
      <p style="margin:0;font-size:15px;font-weight:bold;color:#111827;">${escapeHtml(task.title)}</p>
      <p style="margin:6px 0 0;color:${pColor};font-size:12px;font-weight:bold;letter-spacing:0.5px;">Priority: ${pLabel}</p>
      ${task.dueDate ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Due: ${escapeHtml(task.dueDate)}</p>` : ""}
    </td>
  </tr>
  <tr>
    <td style="padding:0 20px 18px;">
      <a href="${task.completionHref}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:bold;text-decoration:none;">MARK COMPLETE</a>
    </td>
  </tr>
</table>`;
}

function simpleList(items: { title: string }[]): string {
  return items
    .map(
      (t, i) =>
        `<p style="margin:4px 0;">${i + 1}. <span style="font-weight:bold;">${escapeHtml(t.title)}</span></p>`
    )
    .join("");
}

export function dailyTaskEmail(firstName: string, tasks: TaskLine[]): string {
  const cards = tasks.map(taskCard).join("");
  return baseEmail(
    `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Good morning ${escapeHtml(firstName)},</h2>
    <p style="margin:0 0 12px;color:#4b5563;">Here are your tasks for today:</p>
    ${cards}
    <p style="margin-top:16px;color:#6b7280;">Have a productive day.</p>`
  );
}

export function overdueEmail(firstName: string, tasks: { title: string; completionHref: string; dueDate: string | null }[]): string {
  const lines = simpleList(tasks);
  const cards = tasks
    .map((t) =>
      taskCard({ title: t.title, priority: "urgent", dueDate: t.dueDate, completionHref: t.completionHref })
    )
    .join("");
  return baseEmail(
    `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">You have overdue tasks</h2>
    ${lines}
    ${cards}
    <p style="color:#6b7280;">Please update the status of these tasks at your earliest convenience.</p>`
  );
}

export function rejectionEmail(
  firstName: string,
  taskTitle: string,
  reason: string,
  completionHref: string
): string {
  return baseEmail(
    `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Your submission needs revision</h2>
    <p style="margin:0 0 12px;color:#4b5563;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 12px;color:#4b5563;">Your submission for the task below was reviewed and not approved. Please address the feedback and resubmit.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:16px 20px;font-size:15px;font-weight:bold;color:#111827;">${escapeHtml(taskTitle)}</td></tr>
      <tr><td style="padding:0 20px 16px;color:#4b5563;font-size:14px;line-height:1.6;">
        <span style="font-weight:bold;color:#dc2626;">Reason:</span> ${reason ? escapeHtml(reason) : "Please fix and resubmit."}
      </td></tr>
      <tr><td style="padding:0 20px 20px;">
        <a href="${completionHref}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:bold;text-decoration:none;">RESUBMIT PROOF</a>
      </td></tr>
    </table>
    <p style="color:#6b7280;">If you have questions, reach out to your admin.</p>`
  );
}

export function weeklySummaryEmail(firstName: string, assigned: number, completed: number, pending: number, overdue: number): string {
  return baseEmail(
    `<h2 style="margin:0 0 8px;font-size:18px;">Your weekly summary</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        ${["Assigned", "Completed", "Pending", "Overdue"]
          .map((label, i) => {
            const value = [assigned, completed, pending, overdue][i];
            const color = i === 1 ? "#16a34a" : i === 3 ? "#dc2626" : "#111827";
            return `<td align="center" style="border:1px solid #e5e7eb;padding:14px 0;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:${color};">${value}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">${label}</p>
            </td>`;
          })
          .join("")}
      </tr>
    </table>
    <p style="color:#6b7280;margin-top:16px;">Keep up the great work!</p>`
  );
}

export function adminReportEmail(
  total: number,
  completed: number,
  pending: number,
  overdue: number,
  topRates: { name: string; rate: number }[]
): string {
  const rows = topRates.map((r) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(r.name)}</td><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-weight:bold;">${r.rate}%</td></tr>`).join("");
  return baseEmail(
    `<h2 style="margin:0 0 8px;font-size:18px;">Weekly Employee Task Report</h2>
    <table style="margin-top:12px;border-collapse:collapse;width:100%;">
      <tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Total Tasks</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;">${total}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Completed</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#16a34a;">${completed}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Pending</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;">${pending}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Overdue</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;color:#dc2626;">${overdue}</td></tr>
    </table>
    <h3 style="margin-top:20px;font-size:15px;">Top completion rates</h3>
    <table style="border-collapse:collapse;width:100%;">
      <tr><th align="left" style="padding:6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Employee</th><th align="right" style="padding:6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;">Rate</th></tr>
      ${rows || `<tr><td style="padding:6px 0;color:#9ca3af;">No data</td></tr>`}
    </table>`
  );
}