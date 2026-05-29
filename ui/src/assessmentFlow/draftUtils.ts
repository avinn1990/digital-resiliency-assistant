import type { AssessmentDraft } from "./types";

export type DraftStatus = "pending" | "completed";

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
