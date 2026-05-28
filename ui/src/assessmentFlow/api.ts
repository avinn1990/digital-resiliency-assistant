import { API_BASE } from "../lib/apiBase";
import type { EvaluationServiceBundle, EvaluationServiceSummary } from "./types";

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

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function listEvaluationServices(authToken?: string) {
  return request<EvaluationServiceSummary[]>("/evaluation-services", undefined, authToken);
}

export function getEvaluationServiceContent(serviceId: string, authToken?: string) {
  return request<EvaluationServiceBundle>(
    `/evaluation-services/${encodeURIComponent(serviceId)}/content`,
    undefined,
    authToken
  );
}

