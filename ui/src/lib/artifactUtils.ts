import type { ChatAssessmentState, PendingArtifact } from "../assessmentFlow/types";
import { aggregatePendingArtifacts, snapshotFromChatState } from "./chatDraft";

export function countUnresolvedPendingArtifacts(draft: {
  pendingArtifacts?: PendingArtifact[];
  chatState?: ChatAssessmentState;
}): number {
  if (draft.pendingArtifacts?.length) {
    return draft.pendingArtifacts.filter((item) => item.status === "pending").length;
  }
  if (!draft.chatState) return 0;
  return aggregatePendingArtifacts(snapshotFromChatState(draft.chatState)).filter(
    (item) => item.status === "pending"
  ).length;
}

export const PENDING_ARTIFACT_REASON_LABELS: Record<PendingArtifact["reason"], string> = {
  not_available: "Not available",
  needs_permission: "Needs permission",
  will_provide_later: "Will provide later",
};

export const ARTIFACT_RETENTION_NOTICE =
  "Uploaded files are kept for 7 days, then removed for security. You can re-upload if needed.";
