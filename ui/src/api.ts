function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
  if (!raw) return "/api";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes("localhost") || raw.startsWith("127.")) {
    return `http://${raw}`;
  }
  return `https://${raw}`;
}

const API_BASE = resolveApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type FrameworkSummary = {
  id: string;
  name: string;
  version: string;
  description?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssessmentResult = {
  session_id: string;
  framework_id: string;
  overall_score: number;
  maturity_label: string;
  summary: string;
  control_results: Array<{
    control_id: string;
    score: number;
    status: string;
    evidence: string;
    recommendations: string[];
  }>;
};

export function listFrameworks() {
  return request<FrameworkSummary[]>("/frameworks");
}

export function startSession(frameworkId: string) {
  return request<{
    session_id: string;
    framework_id: string;
    reply: string;
    progress: { current: number; total: number };
  }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ framework_id: frameworkId }),
  });
}

export function sendMessage(sessionId: string, message: string) {
  return request<{
    reply: string;
    completed: boolean;
    progress: { current: number; total: number };
  }>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function runAssessment(sessionId: string) {
  return request<AssessmentResult>(`/sessions/${sessionId}/assess`, {
    method: "POST",
  });
}
