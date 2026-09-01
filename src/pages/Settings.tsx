import { useEffect, useState } from "react";
import { Mail, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/State";
import { supabase } from "@/lib/supabase";

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

interface SettingsForm {
  timezone: string;
  daily_email_time: string;
  from_email: string;
  github_repo: string;
  weekly_report_recipient: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    timezone: "Asia/Karachi",
    daily_email_time: "08:00",
    from_email: "",
    github_repo: "",
    weekly_report_recipient: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .limit(1)
      .then(({ data, error: err }) => {
        if (!err && data && data.length > 0) {
          const s = data[0];
          setForm({
            timezone: s.timezone ?? "Asia/Karachi",
            daily_email_time: s.daily_email_time ?? "08:00",
            from_email: s.from_email ?? "",
            github_repo: s.github_repo ?? "",
            weekly_report_recipient: s.weekly_report_recipient ?? "",
          });
        }
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);
    const patch = {
      timezone: form.timezone,
      daily_email_time: form.daily_email_time,
      from_email: form.from_email.trim() || null,
      github_repo: form.github_repo.trim() || null,
      weekly_report_recipient: form.weekly_report_recipient.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: err } = await supabase.from("settings").select("id").limit(1);
    let result;
    if (!err && data && data.length > 0) {
      result = await supabase.from("settings").update(patch).eq("id", data[0].id);
    } else {
      result = await supabase.from("settings").insert(patch);
    }
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setFeedback("Settings saved.");
  }

  if (loading) return <Spinner label="Loading settings..." />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="General configuration" />

      {feedback && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{feedback}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="General" subtitle="Timezone and scheduling defaults" />
          <CardBody className="space-y-4">
            <Select
              label="Default Timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <Input
              label="Daily Email Time"
              type="time"
              value={form.daily_email_time}
              onChange={(e) => setForm({ ...form, daily_email_time: e.target.value })}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Email" subtitle="Sender details for employee emails" />
          <CardBody className="space-y-4">
            <div>
              <Input
                label="From Email"
                type="email"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="tasks@company.com"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                <Mail className="h-3 w-3" />
                Must be a verified sender in Resend.
              </p>
            </div>
            <Input
              label="Weekly Report Recipient"
              type="email"
              value={form.weekly_report_recipient}
              onChange={(e) => setForm({ ...form, weekly_report_recipient: e.target.value })}
              placeholder="manager@company.com"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="GitHub" subtitle="Repository for GitHub issues" />
          <CardBody>
            <Input
              label="Repository"
              value={form.github_repo}
              onChange={(e) => setForm({ ...form, github_repo: e.target.value })}
              placeholder="organization/repository"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Automation" subtitle="Defaults used by scheduled runs" />
          <CardBody>
            <p className="text-sm text-gray-500">
              Daily email defaults are configured here and per-automation on the Automations page.
              Automations run via GitHub Actions using the timezone above.
            </p>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}