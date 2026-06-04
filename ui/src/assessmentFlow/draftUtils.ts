import type { AssessmentDraft } from "./types";

export type DraftStatus = "pending" | "completed";

function isChatDraft(draft: AssessmentDraft): boolean {
  return draft.mode === "chat" || Boolean(draft.chatState);
}

function chatCompletedServiceIds(draft: AssessmentDraft): Set<string> {
  const chatState = draft.chatState;
  const completed = new Set(chatState?.completedServiceIds ?? []);
  if (chatState?.activeServiceId && chatState.completed) {
    completed.add(chatState.activeServiceId);
  }
  return completed;
}

export function getDraftStatus(draft: AssessmentDraft): DraftStatus {
  if (draft.selectedServiceIds.length === 0) return "pending";
  if (isChatDraft(draft)) {
    const completed = chatCompletedServiceIds(draft);
    const allDone = draft.selectedServiceIds.every((id) => completed.has(id));
    return allDone ? "completed" : "pending";
  }
  const allDone = draft.selectedServiceIds.every(
    (id) => !!draft.responsesByService[id]?.answeredAt
  );
  return allDone ? "completed" : "pending";
}

export function getDraftProgress(draft: AssessmentDraft) {
  const servicesTotal = draft.selectedServiceIds.length;
  if (isChatDraft(draft)) {
    return {
      servicesDone: chatCompletedServiceIds(draft).size,
      servicesTotal,
    };
  }
  const servicesDone = draft.selectedServiceIds.filter(
    (id) => !!draft.responsesByService[id]?.answeredAt
  ).length;
  return { servicesDone, servicesTotal };
}

export function isChatAssessmentDraft(draft: AssessmentDraft): boolean {
  return isChatDraft(draft);
}
