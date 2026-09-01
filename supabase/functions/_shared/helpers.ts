// Shared helpers for Stratos edge functions.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
export const APP_URL = Deno.env.get("APP_URL") ?? "";
export const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
export const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";

export interface Env {
  SUPABASE_URL: string;
  SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  APP_URL: string;
  FROM_EMAIL: string;
}

export const serviceClient = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function bodyOf(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function nowIso(): Date {
  return new Date();
}

export function dateKeyInTz(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function randomToken(len = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export const RESEND_HOST =
  "https://api.resend.com";

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<SendResult> {
  const sender = from || FROM_EMAIL;
  if (!sender) {
    return { ok: false, error: "FROM_EMAIL is not configured" };
  }
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }
  try {
    const res = await fetch(`${RESEND_HOST}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: sender, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.message ?? `Resend error ${res.status}` };
    }
    return { ok: true, messageId: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown send error" };
  }
}

export function completionHref(token: string): string {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}/#/c/${token}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}