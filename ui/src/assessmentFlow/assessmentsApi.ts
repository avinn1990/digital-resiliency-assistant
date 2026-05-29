import { getApiBase } from "../lib/apiBase";
import type { AssessmentDraft } from "./types";

export type UserDraftSummary = {
  assessmentId: string;
  updatedAt: string;
  company: string;
  username: string;
  role: string;
  ownerEmail?: string;
  status: "pending" | "completed";
  servicesDone: number;
  servicesTotal: number;
};

async function request<T>(
  path: string,
  options?: RequestInit,
  authToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (authToken?.trim()) {
    headers.Authorization = `Bearer ${authToken.trim()}`;
  }

  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listAssessments(authToken: string) {
  return request<UserDraftSummary[]>("/assessments", undefined, authToken);
}

export function getAssessment(assessmentId: string, authToken: string) {
  return request<AssessmentDraft>(
    `/assessments/${encodeURIComponent(assessmentId)}`,
    undefined,
    authToken
  );
}

export function createAssessment(draft: AssessmentDraft, authToken: string) {
  return request<AssessmentDraft>(
    "/assessments",
    {
      method: "POST",
      body: JSON.stringify(draft),
    },
    authToken
  );
}

export function updateAssessment(
  assessmentId: string,
  draft: AssessmentDraft,
  authToken: string
) {
  return request<AssessmentDraft>(
    `/assessments/${encodeURIComponent(assessmentId)}`,
    {
      method: "PUT",
      body: JSON.stringify(draft),
    },
    authToken
  );
}

export function deleteAssessment(assessmentId: string, authToken: string) {
  return request<void>(
    `/assessments/${encodeURIComponent(assessmentId)}`,
    { method: "DELETE" },
    authToken
  );
}
