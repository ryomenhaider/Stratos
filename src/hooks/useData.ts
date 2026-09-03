import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Automation,
  AutomationRun,
  Department,
  EmailLog,
  Employee,
  TaskHistory,
  TaskProof,
  TaskWithRelations,
} from "@/types";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useEmployees(activeOnly = false) {
  const [state, setState] = useState<FetchState<Employee[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    setState((s) => ({ ...s, loading: true }));
    let query = supabase
      .from("employees")
      .select("*")
      .order("name", { ascending: true });
    if (activeOnly) {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    setState({
      data: (data as Employee[]) ?? [],
      loading: false,
      error: error ? error.message : null,
      reload: fetchData,
    });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  return state;
}

export function useDepartments() {
  const [state, setState] = useState<FetchState<Department[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });
    setState({
      data: (data as Department[]) ?? [],
      loading: false,
      error: error ? error.message : null,
      reload: fetchData,
    });
  }

  useEffect(() => {
    fetchData();
  }, []);

  return state;
}

export function useTasks() {
  const [state, setState] = useState<FetchState<TaskWithRelations[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    setState((s) => ({ ...s, loading: true }));
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `*,
        assignees:task_assignees(employee_id, assigned_at, employee:employees(id, name, email, department, role, github_username, active)),
        proofs:task_proofs(*, employee:employees(id, name, email)),
        completed_by_employee:employees!completed_by(id, name, email, department, role, github_username, active),
        created_by_employee:employees!created_by(id, name, email, department, role, github_username, active)
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setState({ data: null, loading: false, error: error.message, reload: fetchData });
      return;
    }
    const raw = tasks as unknown as (TaskWithRelations & { proofs?: TaskProof[] })[];
    const mapped = raw.map((t) => ({
      ...t,
      proof: (t.proofs ?? []).slice().sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0] ?? null,
    })) as TaskWithRelations[];
    setState({ data: mapped, loading: false, error: null, reload: fetchData });
  }

  useEffect(() => {
    fetchData();
  }, []);

  return state;
}

export function useTask(id: string | undefined) {
  const [state, setState] = useState<FetchState<TaskWithRelations>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    if (!id) return;
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `*,
        assignees:task_assignees(employee_id, assigned_at, employee:employees(id, name, email, department, role, github_username, active)),
        proofs:task_proofs(*, employee:employees(id, name, email)),
        completed_by_employee:employees!completed_by(id, name, email, department, role, github_username, active),
        created_by_employee:employees!created_by(id, name, email, department, role, github_username, active)
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      setState({ data: null, loading: false, error: error.message, reload: fetchData });
      return;
    }
    const d = data as TaskWithRelations & { proofs?: TaskProof[] };
    const mapped: TaskWithRelations = {
      ...(data as TaskWithRelations),
      proof: (d.proofs ?? []).slice().sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0] ?? null,
    };
    setState({ data: mapped, loading: false, error: null, reload: fetchData });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return state;
}

export function useTaskHistory(taskId: string | undefined) {
  const [state, setState] = useState<FetchState<TaskHistory[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    if (!taskId) return;
    const { data, error } = await supabase
      .from("task_history")
      .select(
        `*,
        employee:employees(id, name, email)`
      )
      .eq("task_id", taskId)
      .order("timestamp", { ascending: false });

    if (error) {
      setState({ data: null, loading: false, error: error.message, reload: fetchData });
      return;
    }
    setState({ data: data as TaskHistory[], loading: false, error: null, reload: fetchData });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return state;
}

export function useAutomations() {
  const [state, setState] = useState<FetchState<Automation[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .order("type", { ascending: true });
    setState({
      data: (data as Automation[]) ?? [],
      loading: false,
      error: error ? error.message : null,
      reload: fetchData,
    });
  }

  useEffect(() => {
    fetchData();
  }, []);

  return state;
}

export function useAutomationRuns() {
  const [state, setState] = useState<FetchState<AutomationRun[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    const { data, error } = await supabase
      .from("automation_runs")
      .select(
        `*,
        automation:automations(id, name, type)`
      )
      .order("started_at", { ascending: false })
      .limit(20);
    setState({
      data: (data as AutomationRun[]) ?? [],
      loading: false,
      error: error ? error.message : null,
      reload: fetchData,
    });
  }

  useEffect(() => {
    fetchData();
  }, []);

  return state;
}

export function useEmailLogs(limit = 50) {
  const [state, setState] = useState<FetchState<EmailLog[]>>({
    data: null,
    loading: true,
    error: null,
    reload: () => {},
  });

  async function fetchData() {
    const { data, error } = await supabase
      .from("email_logs")
      .select(
        `*,
        employee:employees(id, name, email)`
      )
      .order("sent_at", { ascending: false })
      .limit(limit);
    setState({
      data: (data as EmailLog[]) ?? [],
      loading: false,
      error: error ? error.message : null,
      reload: fetchData,
    });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return state;
}
