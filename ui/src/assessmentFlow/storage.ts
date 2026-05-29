import type { AssessmentDraft } from "./types";

const STORAGE_PREFIX = "dra.assessmentDraft.";
const INDEX_KEY = "dra.assessmentDraftIndex";

type DraftIndexItem = {
  assessmentId: string;
  updatedAt: string;
  company: string;
  username: string;
  role: string;
  ownerEmail?: string;
};

export type DraftStatus = "pending" | "completed";

export type UserDraftSummary = DraftIndexItem & {
  status: DraftStatus;
  servicesDone: number;
  servicesTotal: number;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readIndex(): DraftIndexItem[] {
  return safeJsonParse<DraftIndexItem[]>(localStorage.getItem(INDEX_KEY)) ?? [];
}

function writeIndex(items: DraftIndexItem[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(items));
}

export function getDraftStatus(draft: AssessmentDraft): DraftStatus {
  if (draft.selectedServiceIds.length === 0) return "pending";
  const allDone = draft.selectedServiceIds.every(
    (id) => !!draft.responsesByService[id]?.answeredAt
  );
  return allDone ? "completed" : "pending";
}

export function getDraftProgress(draft: AssessmentDraft) {
  const servicesTotal = draft.selectedServiceIds.length;
  const servicesDone = draft.selectedServiceIds.filter(
    (id) => !!draft.responsesByService[id]?.answeredAt
  ).length;
  return { servicesDone, servicesTotal };
}

export function listUserDrafts(ownerEmail?: string): UserDraftSummary[] {
  const summaries: UserDraftSummary[] = [];

  for (const item of listDrafts()) {
    const draft = loadDraft(item.assessmentId);
    if (!draft) continue;

    if (ownerEmail) {
      const draftOwner = draft.ownerEmail?.trim().toLowerCase();
      const viewer = ownerEmail.trim().toLowerCase();
      if (draftOwner && draftOwner !== viewer) continue;
    }

    const { servicesDone, servicesTotal } = getDraftProgress(draft);
    summaries.push({
      ...item,
      ownerEmail: draft.ownerEmail,
      status: getDraftStatus(draft),
      servicesDone,
      servicesTotal,
    });
  }

  return summaries;
}

export function listDrafts(): DraftIndexItem[] {
  return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadDraft(assessmentId: string): AssessmentDraft | null {
  return (
    safeJsonParse<AssessmentDraft>(
      localStorage.getItem(`${STORAGE_PREFIX}${assessmentId}`)
    ) ?? null
  );
}

export function saveDraft(draft: AssessmentDraft) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${draft.assessmentId}`,
    JSON.stringify(draft)
  );

  const index = readIndex();
  const next: DraftIndexItem = {
    assessmentId: draft.assessmentId,
    updatedAt: draft.updatedAt,
    company: draft.profile.company,
    username: draft.profile.username,
    role: draft.profile.role,
    ownerEmail: draft.ownerEmail,
  };
  const merged = [next, ...index.filter((i) => i.assessmentId !== next.assessmentId)];
  writeIndex(merged.slice(0, 25));
}

export function deleteDraft(assessmentId: string) {
  localStorage.removeItem(`${STORAGE_PREFIX}${assessmentId}`);
  writeIndex(readIndex().filter((i) => i.assessmentId !== assessmentId));
}

