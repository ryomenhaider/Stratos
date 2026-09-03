import { useEffect, useState } from "react";
import { GitBranch, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useTasks } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";

export default function GitHubPage() {
  const tasksState = useTasks();
  const [repo, setRepo] = useState("");
  const [savedRepo, setSavedRepo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("id, github_repo")
      .limit(1)
      .then(({ data, error: err }) => {
        if (!err && data && data.length > 0) {
          setSavedRepo(data[0].github_repo);
          setRepo(data[0].github_repo ?? "");
        }
      });
  }, []);

  async function saveRepo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);
    const { data, error: err } = await supabase
      .from("settings")
      .select("id")
      .order("id", { ascending: true })
      .limit(1);
    let result;
    if (!err && data && data.length > 0) {
      result = await supabase
        .from("settings")
        .update({ github_repo: repo.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", data[0].id);
    } else {
      result = await supabase
        .from("settings")
        .insert({ github_repo: repo.trim() || null });
      if (result.error && result.error.code === "23505") {
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .limit(1);
        if (existing && existing.length > 0) {
          result = await supabase
            .from("settings")
            .update({ github_repo: repo.trim() || null, updated_at: new Date().toISOString() })
            .eq("id", existing[0].id);
        }
      }
    }
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSavedRepo(repo.trim() || null);
    setFeedback("Repository saved.");
  }

  const linkedTasks = (tasksState.data ?? []).filter((t) => t.github_issue_url);

  return (
    <div>
      <PageHeader
        title="GitHub Integration"
        subtitle="Optional GitHub issues for developers"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Repository"
            subtitle="The repository used to create GitHub issues for tasks"
            action={
              savedRepo ? (
                <Badge className="bg-green-100 text-green-700">Connected</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-500">Not configured</Badge>
              )
            }
          />
          <CardBody>
            {feedback && (
              <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                {feedback}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={saveRepo} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Repository"
                  placeholder="organization/repository"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Issues are created in this repository when the "Create GitHub Issue" option is
                  enabled on a task. Leave empty to disable.
                </p>
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Overview" />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">Linked tasks</span>
              <Badge className="bg-primary-100 text-primary-700">{linkedTasks.length}</Badge>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <div className="flex items-center gap-2 font-medium">
                <GitBranch className="h-4 w-4" />
                Optional feature
              </div>
              <p className="mt-1 text-xs">
                GitHub is not required. Employees without a GitHub username receive tasks by email
                only, with no issue created.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}