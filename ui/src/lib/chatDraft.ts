import type {
  AssessmentDraft,
  ChatAssessmentState,
  ChatServiceSnapshot,
  UserProfile,
} from "../assessmentFlow/types";
import { createAssessmentId } from "../assessmentFlow/id";
import { buildChatPath } from "./chatNavigation";
import type { ChatMessage, SessionProgress } from "../services/types";

export type ChatSessionSnapshot = {
  messages: ChatMessage[];
  progress: SessionProgress;
  completed: boolean;
  activeServiceId: string;
  remainingServiceIds: string[];
  completedServiceIds: string[];
  serviceSnapshots: Record<string, ChatServiceSnapshot>;
};

function toBackendMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export function buildServiceSnapshot(params: {
  messages: ChatMessage[];
  progress: SessionProgress;
  completed: boolean;
  capabilityStates?: Record<string, unknown>;
  facts?: Record<string, unknown>;
}): ChatServiceSnapshot {
  return {
    messages: toBackendMessages(params.messages),
    progress: params.progress,
    completed: params.completed,
    capabilityStates: params.capabilityStates,
    facts: params.facts,
  };
}

export function buildChatAssessmentState(snapshot: ChatSessionSnapshot): ChatAssessmentState {
  return {
    messages: snapshot.messages,
    progress: snapshot.progress,
    completed: snapshot.completed,
    activeServiceId: snapshot.activeServiceId,
    remainingServiceIds: snapshot.remainingServiceIds,
    completedServiceIds: snapshot.completedServiceIds,
    serviceSnapshots: snapshot.serviceSnapshots,
  };
}

export function buildChatDraft(params: {
  assessmentId?: string;
  profile: UserProfile;
  ownerEmail?: string;
  selectedServiceIds: string[];
  snapshot: ChatSessionSnapshot;
  existingDraft?: AssessmentDraft | null;
}): AssessmentDraft {
  const now = new Date().toISOString();
  const assessmentId =
    params.assessmentId ??
    params.existingDraft?.assessmentId ??
    createAssessmentId({
      company: params.profile.company,
      role: params.profile.role,
      username: params.profile.username,
    });

  return {
    assessmentId,
    createdAt: params.existingDraft?.createdAt ?? now,
    updatedAt: now,
    ownerEmail: params.ownerEmail ?? params.existingDraft?.ownerEmail,
    mode: "chat",
    profile: params.profile,
    selectedServiceIds: params.selectedServiceIds,
    currentServiceId: params.snapshot.activeServiceId,
    responsesByService: params.existingDraft?.responsesByService ?? {},
    chatState: buildChatAssessmentState(params.snapshot),
  };
}

export function isChatAssessmentDraft(draft: AssessmentDraft): boolean {
  return draft.mode === "chat" || Boolean(draft.chatState);
}

export function chatDraftResumePath(draft: AssessmentDraft): string {
  const active =
    draft.currentServiceId ||
    draft.chatState?.activeServiceId ||
    draft.selectedServiceIds[0] ||
    "";
  return buildChatPath(draft.selectedServiceIds, draft.assessmentId, active);
}

export function snapshotFromChatState(chatState: ChatAssessmentState): ChatSessionSnapshot {
  return {
    messages: chatState.messages,
    progress: chatState.progress,
    completed: chatState.completed,
    activeServiceId: chatState.activeServiceId,
    remainingServiceIds: chatState.remainingServiceIds,
    completedServiceIds: chatState.completedServiceIds,
    serviceSnapshots: chatState.serviceSnapshots,
  };
}
