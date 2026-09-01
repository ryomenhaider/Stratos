#!/usr/bin/env python3
"""Run Stratos automations by calling the Supabase Edge Function.

Usage:
    python scripts/run_automation.py [automation_type ...]
    # If no types given, runs daily_tasks.
    # Example: python scripts/run_automation.py daily_tasks overdue_reminder
"""

import json
import sys
import os

try:
    import requests
except ImportError:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.", file=sys.stderr)
    sys.exit(1)

FUNCTIONS_URL = f"{SUPABASE_URL.rstrip('/')}/functions/v1"

ALLOWED_TYPES = [
    "daily_tasks",
    "overdue_reminder",
    "weekly_employee_summary",
    "weekly_admin_report",
]


def run_automation(automation_type: str) -> tuple[int, dict]:
    resp = requests.post(
        f"{FUNCTIONS_URL}/run-automation",
        headers={
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        },
        json={"type": automation_type},
        timeout=300,
    )
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    return resp.status_code, data


def main() -> None:
    types_to_run = sys.argv[1:] if len(sys.argv) > 1 else ["daily_tasks"]
    failed = []

    for t in types_to_run:
        if t not in ALLOWED_TYPES:
            print(f"⚠ Unknown type '{t}' — skipping.", file=sys.stderr)
            continue

        print(f"▶ Running {t} ...")
        status_code, data = run_automation(t)
        ok = data.get("ok") or data.get("status") == "success"
        label = "✓" if ok else "✗"
        print(f"  {label} {status_code}: {json.dumps(data, indent=2)}")
        if not ok:
            failed.append(t)

    if failed:
        print(f"\nFailed automations: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)
    print("\nAll automations completed successfully.")


if __name__ == "__main__":
    main()
