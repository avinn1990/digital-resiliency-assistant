import { getApiBase } from "../lib/apiBase";
import type { AssessmentDraft } from "./types";

export type UserDraftSummary = {
  assessmentId: string;
  updatedAt: string;
  company: string;
  username: string;
  role: string;
  ownerEmail?: string;
  mode?: "questionnaire" | "chat";
  status: "pending" | "completed";
  servicesDone: number;
  servicesTotal: number;
  pendingArtifactsCount?: number;
};

export type ArtifactsListResponse = {
  pendingArtifacts: import("./types").PendingArtifact[];
  uploadedArtifacts: import("./types").UploadedArtifact[];
};

export type UploadArtifactResponse = {
  artifact: import("./types").UploadedArtifact;
  pendingArtifacts: import("./types").PendingArtifact[];
  uploadedArtifacts: import("./types").UploadedArtifact[];
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

export async function listArtifacts(assessmentId: string, authToken: string) {
  return request<ArtifactsListResponse>(
    `/assessments/${encodeURIComponent(assessmentId)}/artifacts`,
    undefined,
    authToken
  );
}

export async function uploadArtifact(
  assessmentId: string,
  authToken: string,
  file: File,
  options?: {
    serviceId?: string;
    capabilityId?: string;
    pendingArtifactId?: string;
  }
) {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.serviceId) formData.append("service_id", options.serviceId);
  if (options?.capabilityId) formData.append("capability_id", options.capabilityId);
  if (options?.pendingArtifactId) {
    formData.append("pending_artifact_id", options.pendingArtifactId);
  }

  const apiBase = await getApiBase();
  const response = await fetch(
    `${apiBase}/assessments/${encodeURIComponent(assessmentId)}/artifacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken.trim()}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Upload failed: ${response.status}`);
  }

  return response.json() as Promise<UploadArtifactResponse>;
}

export async function getArtifactDownloadRequest(
  assessmentId: string,
  fileId: string,
  authToken: string
) {
  const apiBase = await getApiBase();
  const response = await fetch(
    `${apiBase}/assessments/${encodeURIComponent(assessmentId)}/artifacts/${encodeURIComponent(fileId)}`,
    {
      headers: {
        Authorization: `Bearer ${authToken.trim()}`,
      },
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = match?.[1] ?? fileId;
  return { blob, fileName };
}
