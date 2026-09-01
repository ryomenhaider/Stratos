import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Phase = "loading" | "done" | "error";

export default function CompleteTask() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function complete() {
      try {
        const { data, error } = await supabase.functions.invoke("complete-task", {
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (error) {
          setPhase("error");
          setMessage(error.message);
          return;
        }
        if (data?.ok) {
          setPhase("done");
          setMessage(data.message ?? "Task completed successfully.");
        } else {
          setPhase("error");
          setMessage(data?.message ?? "Something went wrong.");
        }
      } catch {
        if (!cancelled) {
          setPhase("error");
          setMessage("Could not reach the completion service.");
        }
      }
    }
    complete();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {phase === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Processing...</h1>
          </>
        )}
        {phase === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">{message}</h1>
            <p className="mt-2 text-sm text-gray-500">You can now close this page.</p>
          </>
        )}
        {phase === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Action Failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <p className="mt-2 text-sm text-gray-400">
              The link may be expired or already used. Contact your administrator.
            </p>
          </>
        )}
      </div>
    </div>
  );
}