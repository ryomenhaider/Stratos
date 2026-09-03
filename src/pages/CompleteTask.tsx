import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Phase = "loading" | "form" | "done" | "error";

interface LookupResult {
  ok?: boolean;
  lookup?: boolean;
  message?: string;
  task?: { id: string; title: string; status: string };
}

export default function CompleteTask() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [taskTitle, setTaskTitle] = useState("");
  const [alreadyPending, setAlreadyPending] = useState(false);
  const [message, setMessage] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Look up the token and task info on load (no proof submitted, so the token
  // and task status are untouched).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { error, data } = await supabase.functions.invoke<LookupResult>(
          "complete-task",
          { body: { token } }
        );
        if (cancelled) return;
        if (error) {
          setPhase("error");
          setMessage(error.message);
          return;
        }
        if (data?.ok && data?.lookup && data.task) {
          setTaskTitle(data.task.title);
          if (data.task.status === "completed") {
            setPhase("done");
            setMessage("This task is already completed.");
            return;
          }
          if (data.task.status === "pending_approval") {
            setAlreadyPending(true);
          }
          setPhase("form");
        } else {
          setPhase("error");
          setMessage(data?.message ?? "Something went wrong with this link.");
        }
      } catch {
        if (!cancelled) {
          setPhase("error");
          setMessage("Could not reach the completion service.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prUrl.trim() && !note.trim()) return;
    setSubmitting(true);
    try {
      const { error, data } = await supabase.functions.invoke<{
        ok?: boolean;
        message?: string;
      }>("complete-task", {
        body: { token, prUrl: prUrl.trim() || null, note: note.trim() || null },
      });
      if (error) {
        setMessage(error.message);
        setSubmitting(false);
        return;
      }
      if (data?.ok) {
        setPhase("done");
        setMessage(data.message ?? "Proof submitted. Awaiting approval.");
      } else {
        setMessage(data?.message ?? "Could not submit your proof.");
        setSubmitting(false);
      }
    } catch {
      setMessage("Could not reach the completion service.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {phase === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
            <h1 className="mt-4 text-center text-lg font-semibold text-gray-900">
              Loading task...
            </h1>
          </>
        )}

        {phase === "done" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">{message}</h1>
            <p className="mt-2 text-sm text-gray-500">You can now close this page.</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Action Failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <p className="mt-2 text-sm text-gray-400">
              The link may be expired or already used. Contact your administrator.
            </p>
          </div>
        )}

        {phase === "form" && (
          <form onSubmit={handleSubmit}>
            <h1 className="text-lg font-semibold text-gray-900">
              Submit proof of completion
            </h1>
            <p className="mt-1 text-sm text-gray-500">{taskTitle}</p>

            {alreadyPending && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                This task is already awaiting approval. You can update your proof below.
              </p>
            )}

            <label className="mt-5 block text-sm font-medium text-gray-700">
              GitHub PR link
              <input
                type="url"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/.../pull/123"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Note (optional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any details about the work completed..."
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || (!prUrl.trim() && !note.trim())}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : "Submit for Approval"}
            </button>

            {message && (
              <p className="mt-3 text-center text-sm text-red-600">{message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}