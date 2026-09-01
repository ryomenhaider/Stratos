import { Badge } from "@/components/ui/Badge";
import {
  PRIORITY_DOT,
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/constants";
import type { TaskPriority, TaskStatus } from "@/types";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const label = TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
  return <Badge className={STATUS_STYLES[status]}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const label = TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
  return <Badge className={PRIORITY_STYLES[priority]} dot={PRIORITY_DOT[priority]}>{label}</Badge>;
}
