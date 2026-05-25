import { API_BASE } from "../lib/apiBase";
import type {
  AssessmentResult,
  FrameworkSummary,
  SessionProgress,
} from "./types";

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

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

export function listFrameworks() {
  return request<FrameworkSummary[]>("/frameworks");
}

export function startSession(frameworkId: string) {
  return request<{
    session_id: string;
    framework_id: string;
    reply: string;
    progress: SessionProgress;
  }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ framework_id: frameworkId }),
  });
}

export function sendMessage(sessionId: string, message: string) {
  return request<{
    reply: string;
    completed: boolean;
    progress: SessionProgress;
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
