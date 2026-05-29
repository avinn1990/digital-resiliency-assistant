import { getApiBase } from "../lib/apiBase";
import type {
  AssessmentResult,
  FrameworkSummary,
  SessionProgress,
} from "./types";

const RETRYABLE_HTTP = /502|503|504|bad gateway|service unavailable/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function requestWithRetry<T>(
  path: string,
  options?: RequestInit,
  attempts = 4
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request<T>(path, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const retryable = RETRYABLE_HTTP.test(lastError.message);
      if (!retryable || attempt === attempts - 1) {
        throw lastError;
      }
      await sleep(2 ** attempt * 2000);
    }
  }
  throw lastError ?? new Error("Request failed");
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const apiBase = await getApiBase();
    const readyResponse = await fetch(`${apiBase}/health/ready`, {
      method: "GET",
    });
    if (readyResponse.ok) {
      const data = (await readyResponse.json()) as { status?: string };
      return data.status === "ok";
    }
    const healthResponse = await fetch(`${apiBase}/health`, { method: "GET" });
    return healthResponse.ok;
  } catch {
    return false;
  }
}

export function listFrameworks() {
  return requestWithRetry<FrameworkSummary[]>("/frameworks");
}

export function startSession(frameworkId: string) {
  return requestWithRetry<{
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
  return requestWithRetry<{
    reply: string;
    completed: boolean;
    progress: SessionProgress;
  }>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function runAssessment(sessionId: string) {
  return requestWithRetry<AssessmentResult>(`/sessions/${sessionId}/assess`, {
    method: "POST",
  });
}
