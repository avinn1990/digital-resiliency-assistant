import { getApiBase } from "../lib/apiBase";
import type {
  AssessmentFocus,
  AssessmentResult,
  EngagementContext,
  FrameworkSummary,
  PillarProgress,
  SessionProgress,
  TopicProgress,
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

export { checkBackendHealth, fetchBackendHealth } from "./health";
export type { BackendHealth, BackendHealthStatus } from "./health";

export function listFrameworks() {
  return requestWithRetry<FrameworkSummary[]>("/frameworks");
}

/** LLM sessions accept one service id; guard against comma-joined URL mistakes. */
export function normalizeFrameworkId(frameworkId: string): string {
  const trimmed = frameworkId.trim();
  if (!trimmed.includes(",")) return trimmed;
  const [first] = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  return first ?? trimmed;
}

export type SessionApiPayload = {
  session_id?: string;
  framework_id?: string;
  reply: string;
  progress: SessionProgress;
  completed?: boolean;
  paused?: boolean;
  capability_states?: Record<string, unknown>;
  assessment_focus?: AssessmentFocus | null;
  engagement_context?: EngagementContext | null;
  capability_topic_progress?: TopicProgress | null;
  pillar_progress?: PillarProgress | null;
  resume_recap?: string | null;
  facts_preview?: Record<string, unknown>;
};

export function startSession(frameworkId: string) {
  const serviceId = normalizeFrameworkId(frameworkId);
  return requestWithRetry<SessionApiPayload & { session_id: string; framework_id: string }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ framework_id: serviceId }),
  });
}

export function restoreSession(frameworkId: string, snapshot: Record<string, unknown>) {
  const serviceId = normalizeFrameworkId(frameworkId);
  return requestWithRetry<SessionApiPayload & { session_id: string; framework_id: string }>("/sessions/restore", {
    method: "POST",
    body: JSON.stringify({ framework_id: serviceId, snapshot }),
  });
}

export function sendMessage(sessionId: string, message: string) {
  return requestWithRetry<SessionApiPayload>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function runAssessment(sessionId: string) {
  return requestWithRetry<AssessmentResult>(`/sessions/${sessionId}/assess`, {
    method: "POST",
  });
}
