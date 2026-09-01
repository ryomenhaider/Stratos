import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { isSupabaseConfigured } from "./lib/supabase";

const rootEl = document.getElementById("root")!;

if (!isSupabaseConfigured) {
  createRoot(rootEl).render(
    <StrictMode>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Stratos needs configuration</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create a <code className="rounded bg-gray-100 px-1">.env</code> file in the project root:
          </p>
          <pre className="mt-3 rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
{`VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p className="mt-3 text-sm text-gray-500">
            Then restart <code className="rounded bg-gray-100 px-1">npm run dev</code>. See the README
            for full Supabase setup (SQL migrations, RLS, edge functions).
          </p>
        </div>
      </div>
    </StrictMode>
  );
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}