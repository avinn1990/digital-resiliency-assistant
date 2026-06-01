import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAssessmentState, ChatServiceSnapshot } from "../assessmentFlow/types";
import {
  buildServiceSnapshot,
  type ChatSessionSnapshot,
  snapshotFromChatState,
} from "../lib/chatDraft";
import { toFriendlyError } from "../lib/userMessages";
import {
  restoreSession,
  runAssessment,
  sendMessage,
  startSession,
} from "../services/agentApi";
import {
  canReachBackend,
  fetchBackendHealth,
  type BackendHealthStatus,
} from "../services/health";
import type {
  AssessmentResult,
  ChatMessage,
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

export function useChatSession(options?: { serviceIds?: string[] }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<SessionProgress>({ current: 0, total: 0 });
  const [completed, setCompleted] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus>("checking");
  const [serviceQueue, setServiceQueue] = useState<string[]>(
    options?.serviceIds?.length ? options.serviceIds : []
  );
  const [activeServiceId, setActiveServiceId] = useState<string>(
    options?.serviceIds?.[0] ?? ""
  );
  const [completedServiceIds, setCompletedServiceIds] = useState<string[]>([]);
  const [serviceSnapshots, setServiceSnapshots] = useState<
    Record<string, ChatServiceSnapshot>
  >({});
  const capabilityStatesRef = useRef<Record<string, unknown>>({});
  const factsRef = useRef<Record<string, unknown>>({});

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
    setServiceQueue(options.serviceIds);
    setActiveServiceId(options.serviceIds[0] ?? "");
    setCompletedServiceIds([]);
    setServiceSnapshots({});
    capabilityStatesRef.current = {};
    factsRef.current = {};
  }, [options?.serviceIds?.join(",")]);

  useEffect(() => {
    if (backendHealth !== "offline" && backendHealth !== "warming") return undefined;
    const intervalId = window.setInterval(() => {
      void refreshHealth();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [backendHealth, refreshHealth]);

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

  const beginSession = useCallback(async () => {
    const serviceId = activeServiceId || serviceQueue[0];
    if (!serviceId) {
      setError("No assessment services were selected.");
      return false;
    }

    setLoading(true);
    setError(null);
    setAssessment(null);
    setMessages([]);
    setSessionId(null);
    capabilityStatesRef.current = {};
    factsRef.current = {};
    try {
      const result = await startSession(serviceId);
      setSessionId(result.session_id);
      const firstMessages = [createMessage("assistant", result.reply)];
      setMessages(firstMessages);
      setProgress(result.progress);
      setCompleted(Boolean(result.completed));
      captureCurrentServiceSnapshot(
        firstMessages,
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
  }, [activeServiceId, serviceQueue, captureCurrentServiceSnapshot]);

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
      setMessages(snapshot.messages);
      setProgress(snapshot.progress);
      setCompleted(snapshot.completed);
      setActiveServiceId(serviceId);
      setServiceQueue([serviceId, ...snapshot.remainingServiceIds]);
      setCompletedServiceIds(snapshot.completedServiceIds);
      setServiceSnapshots(snapshot.serviceSnapshots);

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
        setProgress(result.progress);
        setCompleted(result.completed);
        captureCurrentServiceSnapshot(
          snapshot.messages,
          result.progress,
          result.completed,
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
    [captureCurrentServiceSnapshot]
  );

  const submitUserMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim() || loading) return;
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
        setProgress(result.progress);
        setCompleted(result.completed);
        captureCurrentServiceSnapshot(
          withReply,
          result.progress,
          result.completed,
          result.capability_states,
          result.facts_preview
        );
        setBackendHealth("ready");
        if (result.completed && serviceQueue.length > 1) {
          const finishedServiceId = activeServiceId;
          const next = serviceQueue[1];
          setCompletedServiceIds((prev) =>
            finishedServiceId && !prev.includes(finishedServiceId)
              ? [...prev, finishedServiceId]
              : prev
          );
          setServiceQueue((q) => q.slice(1));
          setActiveServiceId(next);
          capabilityStatesRef.current = {};
          factsRef.current = {};
          const transitionMessages = [
            ...withReply,
            createMessage(
              "assistant",
              "Great — moving to the next service assessment."
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
          setProgress(nextSession.progress);
          setCompleted(Boolean(nextSession.completed));
          captureCurrentServiceSnapshot(
            afterNext,
            nextSession.progress,
            Boolean(nextSession.completed),
            nextSession.capability_states
          );
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
      serviceQueue,
      messages,
      activeServiceId,
      captureCurrentServiceSnapshot,
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

  const resetSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setProgress({ current: 0, total: 0 });
    setCompleted(false);
    setAssessment(null);
    setError(null);
    setCompletedServiceIds([]);
    setServiceSnapshots({});
    capabilityStatesRef.current = {};
    factsRef.current = {};
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

  const connectionStatus: BackendHealthStatus = sessionId ? "ready" : backendHealth;

  return {
    activeServiceId,
    serviceQueue,
    sessionId,
    messages,
    progress,
    completed,
    assessment,
    loading,
    assessing,
    error,
    backendHealth,
    connectionStatus,
    beginSession,
    restoreFromChatState,
    submitUserMessage,
    executeAssessment,
    clearAssessment,
    resetSession,
    refreshHealth,
    getSnapshot,
  };
}
