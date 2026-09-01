import { bodyOf, GITHUB_TOKEN, json, serviceClient } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const { title, body } = await bodyOf(req);
  if (typeof title !== "string" || !title.trim()) {
    return json({ ok: false, message: "Title is required." }, 400);
  }
  if (!GITHUB_TOKEN) {
    return json({ ok: false, message: "GitHub token is not configured." }, 500);
  }

  const supabase = serviceClient();
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("github_repo")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    return json({ ok: false, message: "Internal error." }, 500);
  }
  const repo = settings?.github_repo;
  if (!repo || !repo.includes("/")) {
    return json(
      { ok: false, message: "No GitHub repository configured. Add it on the GitHub page or Settings." },
      400
    );
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title.trim(),
      body: typeof body === "string" && body ? body : "Created from Stratos.",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return json({ ok: false, message: data?.message ?? "GitHub API error" }, 502);
  }

  return json({ ok: true, issue_id: data.number, issue_url: data.html_url });
});