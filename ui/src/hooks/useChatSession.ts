import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ChatAssessmentState, ChatServiceSnapshot } from "../assessmentFlow/types";
import {
  buildServiceSnapshot,
  type ChatSessionSnapshot,
  snapshotFromChatState,
} from "../lib/chatDraft";
import {
  countPendingArtifacts,
  detectMilestone,
  highestMilestoneReached,
  milestoneMessage,
  progressPercent,
} from "../lib/engagementUtils";
import { ENGAGEMENT_COPY, toFriendlyError } from "../lib/userMessages";
import {
  restoreSession,
  runAssessment,
  sendMessage,
  startSession,
  type SessionApiPayload,
} from "../services/agentApi";
import {
  canReachBackend,
  fetchBackendHealth,
  type BackendHealthStatus,
} from "../services/health";
import type {
  AssessmentFocus,
  AssessmentResult,
  ChatMessage,
  PillarProgress,
  SessionEngagementMeta,
  SessionProgress,
} from "../services/types";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

export type PendingServiceTransition = {
  completedServiceId: string;
  completedServiceName: string;
  capabilitiesAssessed: number;
  pendingArtifactCount: number;
  servicesRemaining: number;
  assessmentResult: AssessmentResult | null;
  assessing: boolean;
  sessionIdForAssess: string;
  messagesAfterComplete: ChatMessage[];
};

export type UseChatSessionOptions = {
  serviceIds?: string[];
  activeServiceId?: string;
  activeServiceNameRef?: RefObject<string>;
  onActiveServiceChange?: (serviceId: string) => void;
  onTurnComplete?: () => void;
};

function extractEngagementMeta(result: SessionApiPayload): SessionEngagementMeta {
  return {
    capability_topic_progress: result.capability_topic_progress ?? null,
    pillar_progress: result.pillar_progress ?? null,
    engagement_context: result.engagement_context ?? null,
    paused: Boolean(result.paused),
    resume_recap: result.resume_recap ?? null,
  };
}

export function useChatSession(options?: UseChatSessionOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<SessionProgress>({ current: 0, total: 0 });
  const [assessmentFocus, setAssessmentFocus] = useState<AssessmentFocus | null>(null);
  const [completed, setCompleted] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus>("checking");
  const [engagementMeta, setEngagementMeta] = useState<SessionEngagementMeta>({});
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);
  const [pillarBanner, setPillarBanner] = useState<string | null>(null);
  const [pendingServiceTransition, setPendingServiceTransition] =
    useState<PendingServiceTransition | null>(null);

  const initialQueue = options?.serviceIds?.length ? options.serviceIds : [];
  const initialActive =
    options?.activeServiceId?.trim() ||
    initialQueue[0] ||
    "";

  const [serviceQueue, setServiceQueue] = useState<string[]>(initialQueue);
  const [activeServiceId, setActiveServiceId] = useState<string>(initialActive);
  const [completedServiceIds, setCompletedServiceIds] = useState<string[]>([]);
  const [serviceSnapshots, setServiceSnapshots] = useState<
    Record<string, ChatServiceSnapshot>
  >({});

  const capabilityStatesRef = useRef<Record<string, unknown>>({});
  const factsRef = useRef<Record<string, unknown>>({});
  const lastMilestoneRef = useRef(0);
  const lastPillarCompleteRef = useRef<string | null>(null);
  const resumeRecapShownRef = useRef(false);

  const refreshHealth = useCallback(async () => {
    const health = await fetchBackendHealth();
    setBackendHealth(health.status);
    return canReachBackend(health.status);
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  useEffect(() => {
    if (!options?.serviceIds?.length) return;
    const queue = options.serviceIds;
    const nextActive =
      options.activeServiceId?.trim() && queue.includes(options.activeServiceId.trim())
        ? options.activeServiceId.trim()
        : queue[0] ?? "";
    setServiceQueue(queue);
    setActiveServiceId(nextActive);
    setCompletedServiceIds([]);
    setServiceSnapshots({});
    capabilityStatesRef.current = {};
    factsRef.current = {};
    lastMilestoneRef.current = 0;
    lastPillarCompleteRef.current = null;
  }, [options?.serviceIds?.join(","), options?.activeServiceId]);

  useEffect(() => {
    if (backendHealth !== "offline" && backendHealth !== "warming") return undefined;
    const intervalId = window.setInterval(() => {
      void refreshHealth();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [backendHealth, refreshHealth]);

  const serviceLabel = () =>
    options?.activeServiceNameRef?.current?.trim() || activeServiceId;

  const updateMilestones = useCallback(
    (nextProgress: SessionProgress, pillarProgress?: PillarProgress | null) => {
      const pct = progressPercent(nextProgress.current, nextProgress.total);
      const milestone = detectMilestone(pct, lastMilestoneRef.current);
      if (milestone !== null) {
        lastMilestoneRef.current = milestone;
        setMilestoneBanner(milestoneMessage(milestone, serviceLabel()));
      }
      if (
        pillarProgress?.pillar_complete &&
        pillarProgress.pillar &&
        lastPillarCompleteRef.current !== pillarProgress.pillar
      ) {
        lastPillarCompleteRef.current = pillarProgress.pillar;
        setPillarBanner(ENGAGEMENT_COPY.pillarComplete(pillarProgress.pillar));
      }
    },
    [activeServiceId, options?.activeServiceNameRef]
  );

  const captureCurrentServiceSnapshot = useCallback(
    (
      nextMessages: ChatMessage[],
      nextProgress: SessionProgress,
      nextCompleted: boolean,
      capabilityStates?: Record<string, unknown>,
      facts?: Record<string, unknown>
    ) => {
      if (!activeServiceId) return;
      if (capabilityStates) {
        capabilityStatesRef.current = capabilityStates;
      }
      if (facts) {
        factsRef.current = facts;
      }
      setServiceSnapshots((prev) => ({
        ...prev,
        [activeServiceId]: buildServiceSnapshot({
          messages: nextMessages,
          progress: nextProgress,
          completed: nextCompleted,
          capabilityStates: capabilityStates ?? capabilityStatesRef.current,
          facts: facts ?? factsRef.current,
        }),
      }));
    },
    [activeServiceId]
  );

  const applySessionPayload = useCallback(
    (
      result: SessionApiPayload,
      baseMessages: ChatMessage[],
      capabilityStates?: Record<string, unknown>,
      facts?: Record<string, unknown>
    ) => {
      if (capabilityStates) {
        capabilityStatesRef.current = capabilityStates;
      }
      if (facts) {
        factsRef.current = facts;
      }
      const meta = extractEngagementMeta(result);
      setEngagementMeta(meta);
      setProgress(result.progress);
      setCompleted(Boolean(result.completed));
      setAssessmentFocus(result.assessment_focus ?? null);
      updateMilestones(result.progress, meta.pillar_progress);
      captureCurrentServiceSnapshot(
        baseMessages,
        result.progress,
        Boolean(result.completed),
        capabilityStates ?? capabilityStatesRef.current,
        facts ?? factsRef.current
      );
      options?.onTurnComplete?.();
    },
    [captureCurrentServiceSnapshot, options?.onTurnComplete, updateMilestones]
  );

  const beginSession = useCallback(async () => {
    const raw = activeServiceId || serviceQueue[0];
    const serviceId = raw.includes(",") ? raw.split(",")[0]?.trim() ?? raw : raw;
    if (!serviceId) {
      setError("No assessment services were selected.");
      return false;
    }

    setLoading(true);
    setError(null);
    setAssessment(null);
    setMessages([]);
    setSessionId(null);
    setMilestoneBanner(null);
    setPillarBanner(null);
    lastMilestoneRef.current = 0;
    lastPillarCompleteRef.current = null;
    capabilityStatesRef.current = {};
    factsRef.current = {};
    try {
      const result = await startSession(serviceId);
      setSessionId(result.session_id);
      const firstMessages = [createMessage("assistant", result.reply)];
      setMessages(firstMessages);
      applySessionPayload(result, firstMessages, result.capability_states);
      setBackendHealth("ready");
      return true;
    } catch (err) {
      setError(toFriendlyError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeServiceId, serviceQueue, applySessionPayload]);

  const restoreFromChatState = useCallback(
    async (chatState: ChatAssessmentState) => {
      const snapshot = snapshotFromChatState(chatState);
      const serviceId = snapshot.activeServiceId;
      if (!serviceId) {
        setError("Saved assessment is missing the active service.");
        return false;
      }

      setLoading(true);
      setError(null);
      setAssessment(null);
      setMilestoneBanner(null);
      setPillarBanner(null);
      resumeRecapShownRef.current = false;
      setMessages(snapshot.messages);
      setProgress(snapshot.progress);
      setCompleted(snapshot.completed);
      setActiveServiceId(serviceId);
      setServiceQueue([serviceId, ...snapshot.remainingServiceIds]);
      setCompletedServiceIds(snapshot.completedServiceIds);
      setServiceSnapshots(snapshot.serviceSnapshots);
      lastMilestoneRef.current = highestMilestoneReached(
        progressPercent(snapshot.progress.current, snapshot.progress.total)
      );

      const savedServiceSnapshot = snapshot.serviceSnapshots[serviceId];
      capabilityStatesRef.current = savedServiceSnapshot?.capabilityStates ?? {};
      factsRef.current = savedServiceSnapshot?.facts ?? {};

      try {
        const restorePayload = savedServiceSnapshot
          ? {
              capability_states: savedServiceSnapshot.capabilityStates,
              facts: savedServiceSnapshot.facts,
              messages: savedServiceSnapshot.messages,
              completed: savedServiceSnapshot.completed,
            }
          : { messages: [], completed: false };

        const result = await restoreSession(serviceId, restorePayload);
        setSessionId(result.session_id);
        const meta = extractEngagementMeta(result);
        setEngagementMeta(meta);

        let restoredMessages = snapshot.messages;
        if (result.resume_recap && !resumeRecapShownRef.current) {
          resumeRecapShownRef.current = true;
          restoredMessages = [
            ...snapshot.messages,
            createMessage("assistant", result.resume_recap),
          ];
          setMessages(restoredMessages);
        }

        setProgress(result.progress);
        setCompleted(Boolean(result.completed));
        setAssessmentFocus(result.assessment_focus ?? null);
        updateMilestones(result.progress, meta.pillar_progress);
        captureCurrentServiceSnapshot(
          restoredMessages,
          result.progress,
          Boolean(result.completed),
          result.capability_states
        );
        setBackendHealth("ready");
        return true;
      } catch (err) {
        setError(toFriendlyError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [captureCurrentServiceSnapshot, updateMilestones]
  );

  const advanceToNextService = useCallback(
    async (transition: PendingServiceTransition) => {
      const next = serviceQueue[1];
      if (!next) {
        setPendingServiceTransition(null);
        return;
      }

      setLoading(true);
      try {
        setCompletedServiceIds((prev) =>
          transition.completedServiceId && !prev.includes(transition.completedServiceId)
            ? [...prev, transition.completedServiceId]
            : prev
        );
        setServiceQueue((q) => q.slice(1));
        setActiveServiceId(next);
        options?.onActiveServiceChange?.(next);
        capabilityStatesRef.current = {};
        factsRef.current = {};
        lastMilestoneRef.current = 0;
        lastPillarCompleteRef.current = null;
        setMilestoneBanner(null);
        setPillarBanner(null);

        const serviceIndex = completedServiceIds.length + 2;
        const serviceTotal = completedServiceIds.length + serviceQueue.length;
        const transitionMessages = [
          ...transition.messagesAfterComplete,
          createMessage(
            "assistant",
            ENGAGEMENT_COPY.serviceTransition(
              transition.completedServiceName,
              serviceIndex,
              serviceTotal
            )
          ),
        ];
        setMessages(transitionMessages);

        const nextSession = await startSession(next);
        setSessionId(nextSession.session_id);
        const afterNext = [
          ...transitionMessages,
          createMessage("assistant", nextSession.reply),
        ];
        setMessages(afterNext);
        applySessionPayload(nextSession, afterNext, nextSession.capability_states);
      } catch (err) {
        setError(toFriendlyError(err));
      } finally {
        setPendingServiceTransition(null);
        setLoading(false);
      }
    },
    [serviceQueue, completedServiceIds, options?.onActiveServiceChange, applySessionPayload]
  );

  const continueToNextService = useCallback(() => {
    if (!pendingServiceTransition) return;
    void advanceToNextService(pendingServiceTransition);
  }, [pendingServiceTransition, advanceToNextService]);

  const handleServiceCompleted = useCallback(
    async (
      withReply: ChatMessage[],
      finishedServiceId: string,
      assessSessionId: string
    ) => {
      const capabilitiesAssessed = progress.total;
      const pendingArtifactCount = countPendingArtifacts(capabilityStatesRef.current);
      const servicesRemaining = Math.max(serviceQueue.length - 1, 0);

      if (serviceQueue.length <= 1) {
        setPendingServiceTransition(null);
        return;
      }

      const transition: PendingServiceTransition = {
        completedServiceId: finishedServiceId,
        completedServiceName: serviceLabel(),
        capabilitiesAssessed,
        pendingArtifactCount,
        servicesRemaining,
        assessmentResult: null,
        assessing: true,
        sessionIdForAssess: assessSessionId,
        messagesAfterComplete: withReply,
      };
      setPendingServiceTransition(transition);

      try {
        const result = await runAssessment(assessSessionId);
        setPendingServiceTransition((prev) =>
          prev
            ? {
                ...prev,
                assessmentResult: result,
                assessing: false,
              }
            : null
        );
      } catch {
        setPendingServiceTransition((prev) =>
          prev ? { ...prev, assessing: false } : null
        );
      }
    },
    [progress.total, serviceQueue.length]
  );

  const submitUserMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim() || loading || pendingServiceTransition) return;
      const trimmed = text.trim();
      const nextMessages = [...messages, createMessage("user", trimmed)];
      setMessages(nextMessages);
      setLoading(true);
      setError(null);
      try {
        const result = await sendMessage(sessionId, trimmed);
        const withReply = [
          ...nextMessages,
          createMessage("assistant", result.reply),
        ];
        setMessages(withReply);
        applySessionPayload(
          result,
          withReply,
          result.capability_states,
          result.facts_preview
        );
        setBackendHealth("ready");

        if (result.completed && serviceQueue.length > 1) {
          await handleServiceCompleted(withReply, activeServiceId, sessionId);
        } else if (result.completed && serviceQueue.length === 1) {
          try {
            const assessResult = await runAssessment(sessionId);
            setAssessment(assessResult);
          } catch {
            /* preview optional for final service */
          }
        }
      } catch (err) {
        setError(toFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [
      sessionId,
      loading,
      pendingServiceTransition,
      messages,
      applySessionPayload,
      serviceQueue.length,
      activeServiceId,
      handleServiceCompleted,
    ]
  );

  const executeAssessment = useCallback(async () => {
    if (!sessionId) return;
    setAssessing(true);
    setError(null);
    try {
      const result = await runAssessment(sessionId);
      setAssessment(result);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setAssessing(false);
    }
  }, [sessionId]);

  const clearAssessment = useCallback(() => {
    setAssessment(null);
  }, []);

  const dismissMilestoneBanner = useCallback(() => {
    setMilestoneBanner(null);
  }, []);

  const dismissPillarBanner = useCallback(() => {
    setPillarBanner(null);
  }, []);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setProgress({ current: 0, total: 0 });
    setAssessmentFocus(null);
    setCompleted(false);
    setAssessment(null);
    setError(null);
    setEngagementMeta({});
    setMilestoneBanner(null);
    setPillarBanner(null);
    setPendingServiceTransition(null);
    setCompletedServiceIds([]);
    setServiceSnapshots({});
    capabilityStatesRef.current = {};
    factsRef.current = {};
    lastMilestoneRef.current = 0;
    lastPillarCompleteRef.current = null;
    resumeRecapShownRef.current = false;
    const ids = options?.serviceIds ?? [];
    setServiceQueue(ids);
    setActiveServiceId(ids[0] ?? "");
    void refreshHealth();
  }, [options?.serviceIds?.join(","), refreshHealth]);

  const getSnapshot = useCallback((): ChatSessionSnapshot => {
    return {
      messages,
      progress,
      completed,
      activeServiceId,
      remainingServiceIds: serviceQueue.slice(1),
      completedServiceIds,
      serviceSnapshots: {
        ...serviceSnapshots,
        ...(activeServiceId
          ? {
              [activeServiceId]: buildServiceSnapshot({
                messages,
                progress,
                completed,
                capabilityStates: capabilityStatesRef.current,
                facts: factsRef.current,
              }),
            }
          : {}),
      },
    };
  }, [
    messages,
    progress,
    completed,
    activeServiceId,
    serviceQueue,
    completedServiceIds,
    serviceSnapshots,
  ]);

  const appendUserMessage = useCallback(
    (content: string, attachments?: ChatMessage["attachments"]) => {
      const message = createMessage("user", content);
      if (attachments?.length) {
        message.attachments = attachments;
      }
      setMessages((prev) => [...prev, message]);
    },
    []
  );

  const allServicesCompleted =
    completed && serviceQueue.length <= 1 && !pendingServiceTransition;

  const connectionStatus: BackendHealthStatus = sessionId ? "ready" : backendHealth;

  return {
    activeServiceId,
    serviceQueue,
    completedServiceIds,
    sessionId,
    messages,
    progress,
    assessmentFocus,
    completed,
    allServicesCompleted,
    assessment,
    loading,
    assessing,
    error,
    backendHealth,
    connectionStatus,
    engagementMeta,
    milestoneBanner,
    pillarBanner,
    pendingServiceTransition,
    beginSession,
    restoreFromChatState,
    submitUserMessage,
    appendUserMessage,
    executeAssessment,
    clearAssessment,
    resetSession,
    refreshHealth,
    getSnapshot,
    continueToNextService,
    dismissMilestoneBanner,
    dismissPillarBanner,
  };
}
