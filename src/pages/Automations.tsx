import { useState } from "react";
import { Clock, Mail, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/State";
import { useAutomationRuns, useAutomations } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { AUTOMATION_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { Automation } from "@/types";

const TIMEZONES = [
  "Asia/Karachi",
  "UTC",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
];

export default function Automations() {
  const automationsState = useAutomations();
  const runsState = useAutomationRuns();
  const [running, setRunning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const automations = automationsState.data ?? [];

  function getDefaultTime(type: string): string {
    switch (type) {
      case "daily_tasks":
      case "overdue_reminder":
        return "08:00";
      case "weekly_employee_summary":
        return "09:00";
      case "weekly_admin_report":
        return "18:00";
      default:
        return "08:00";
    }
  }

  async function updateAutomation(automation: Automation, patch: Partial<Automation>) {
    setError(null);
    const { error: err } = await supabase
      .from("automations")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", automation.id);
    if (err) setError(err.message);
    else automationsState.reload();
  }

  async function runManually(type: string) {
    setRunning(type);
    setFeedback(null);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("run-automation", {
      body: JSON.stringify({ type }),
    });
    setRunning(null);
    if (err) {
      setError(err.message);
      return;
    }
    setFeedback(
      data?.status
        ? `Run complete: ${data.status}, sent ${data.emails_sent}, failed ${data.emails_failed}.`
        : "Run triggered."
    );
    runsState.reload();
  }

  if (automationsState.loading) {
    return <Spinner label="Loading automations..." />;
  }

  const typeMeta = (type: string) =>
    AUTOMATION_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div>
      <PageHeader
        title="Automations"
        subtitle="Configure automated task emails"
        action={
          <Button
            variant="secondary"
            onClick={() => runManually("daily_tasks")}
            disabled={running !== null}
          >
            <RefreshCw className="h-4 w-4" />
            {running === "daily_tasks" ? "Running..." : "Run Daily Now"}
          </Button>
        }
      />

      {feedback && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {automations.map((automation) => (
          <Card key={automation.id}>
            <CardHeader
              title={typeMeta(automation.type)}
              subtitle={`${automation.type.replace(/_/g, " ")} automation`}
              action={
                <Toggle
                  checked={automation.enabled}
                  onChange={(v) => updateAutomation(automation, { enabled: v })}
                />
              }
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Time"
                  type="time"
                  value={automation.time ?? getDefaultTime(automation.type)}
                  onChange={(e) => updateAutomation(automation, { time: e.target.value || null })}
                />
                <Select
                  label="Timezone"
                  value={automation.timezone}
                  onChange={(e) => updateAutomation(automation, { timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <span className="mb-1 block text-xs text-gray-500">Description</span>
                <p className="text-sm text-gray-600">
                  {automation.type === "daily_tasks" &&
                    "Sends each employee their tasks due today. No email for employees without tasks."}
                  {automation.type === "overdue_reminder" &&
                    "Sends a reminder to employees who have overdue tasks."}
                  {automation.type === "weekly_employee_summary" &&
                    "Sends each employee a summary of their weekly task activity."}
                  {automation.type === "weekly_admin_report" &&
                    "Sends the admin a weekly company-wide task report."}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                  Last run
                </span>
                {runsState.data?.find((r) => r.automation_id === automation.id) ? (
                  (() => {
                    const run = runsState.data.find((r) => r.automation_id === automation.id);
                    return (
                      <span className="text-sm">
                        <Badge
                          className={
                            run?.status === "success"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }
                        >
                          {run?.status}
                        </Badge>
                        <span className="ml-2 text-xs text-gray-400">
                          {formatDateTime(run?.started_at)}
                          {run && ` · ${run.emails_sent} sent / ${run.emails_failed} failed`}
                        </span>
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-sm text-gray-400">Never</span>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={running !== null}
                  onClick={() => runManually(automation.type)}
                >
                  {running === automation.type ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Run now
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent Runs</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Automation</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {(runsState.data ?? []).map((run) => (
                  <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium">{run.automation?.name ?? typeMeta(run.automation_id)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(run.started_at)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          run.status === "success"
                            ? "bg-green-100 text-green-700"
                            : run.status === "running"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-600"
                        }
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{run.emails_sent}</td>
                    <td className="px-4 py-3 text-gray-600">{run.emails_failed}</td>
                    <td className="px-4 py-3 text-xs text-red-500">{run.error ?? "—"}</td>
                  </tr>
                ))}
                {(runsState.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      No runs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}