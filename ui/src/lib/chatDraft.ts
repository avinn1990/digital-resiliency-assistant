import type {
  AssessmentDraft,
  ChatAssessmentState,
  ChatServiceSnapshot,
  PendingArtifact,
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

type CapabilityState = {
  pending_artifacts?: Array<{
    id?: string;
    label?: string;
    reason?: PendingArtifact["reason"];
    notes?: string;
    status?: PendingArtifact["status"];
    fileId?: string;
    requestedAt?: string;
    fulfilledAt?: string;
  }>;
};

function normalizePendingArtifact(
  raw: NonNullable<CapabilityState["pending_artifacts"]>[number],
  serviceId: string,
  capabilityId: string
): PendingArtifact | null {
  const label = raw.label?.trim();
  if (!label) return null;
  const now = new Date().toISOString();
  return {
    id:
      raw.id?.trim() ||
      `${serviceId}-${capabilityId}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    serviceId,
    capabilityId,
    label,
    reason: raw.reason ?? "not_available",
    notes: raw.notes,
    status: raw.status ?? "pending",
    fileId: raw.fileId,
    requestedAt: raw.requestedAt ?? now,
    fulfilledAt: raw.fulfilledAt,
  };
}

export function aggregatePendingFromServiceSnapshot(
  serviceId: string,
  snapshot: ChatServiceSnapshot
): PendingArtifact[] {
  const capabilityStates = (snapshot.capabilityStates ?? {}) as Record<string, CapabilityState>;
  const results: PendingArtifact[] = [];
  for (const [capabilityId, state] of Object.entries(capabilityStates)) {
    for (const item of state.pending_artifacts ?? []) {
      const normalized = normalizePendingArtifact(item, serviceId, capabilityId);
      if (normalized) results.push(normalized);
    }
  }
  return results;
}

export function aggregatePendingArtifacts(
  snapshot: ChatSessionSnapshot,
  existing: PendingArtifact[] = []
): PendingArtifact[] {
  const byId = new Map(existing.map((item) => [item.id, item]));

  const addItems = (items: PendingArtifact[]) => {
    for (const item of items) {
      const current = byId.get(item.id);
      if (!current) {
        byId.set(item.id, item);
        continue;
      }
      byId.set(item.id, {
        ...current,
        ...item,
        status:
          item.status === "fulfilled" || current.status === "fulfilled"
            ? "fulfilled"
            : "pending",
        fileId: item.fileId ?? current.fileId,
        fulfilledAt: item.fulfilledAt ?? current.fulfilledAt,
      });
    }
  };

  for (const [serviceId, serviceSnapshot] of Object.entries(snapshot.serviceSnapshots)) {
    addItems(aggregatePendingFromServiceSnapshot(serviceId, serviceSnapshot));
  }

  if (snapshot.activeServiceId) {
    const activeSnapshot: ChatServiceSnapshot = {
      messages: snapshot.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      progress: snapshot.progress,
      completed: snapshot.completed,
      capabilityStates:
        snapshot.serviceSnapshots[snapshot.activeServiceId]?.capabilityStates,
    };
    addItems(aggregatePendingFromServiceSnapshot(snapshot.activeServiceId, activeSnapshot));
  }

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
}

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
  pendingArtifacts?: PendingArtifact[];
  uploadedArtifacts?: AssessmentDraft["uploadedArtifacts"];
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

  const pendingArtifacts =
    params.pendingArtifacts ??
    params.existingDraft?.pendingArtifacts ??
    aggregatePendingArtifacts(params.snapshot);

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
    pendingArtifacts,
    uploadedArtifacts:
      params.uploadedArtifacts ?? params.existingDraft?.uploadedArtifacts ?? [],
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
