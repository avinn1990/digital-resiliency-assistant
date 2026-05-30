import { useCallback, useEffect, useState } from "react";
import { toFriendlyError } from "../lib/userMessages";
import { runAssessment, sendMessage, startSession } from "../services/agentApi";
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
  }, [options?.serviceIds?.join(",")]);

  useEffect(() => {
    if (backendHealth !== "offline" && backendHealth !== "warming") return undefined;
    const intervalId = window.setInterval(() => {
      void refreshHealth();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [backendHealth, refreshHealth]);

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
    try {
      const result = await startSession(serviceId);
      setSessionId(result.session_id);
      setMessages([createMessage("assistant", result.reply)]);
      setProgress(result.progress);
      setCompleted(false);
      setBackendHealth("ready");
      return true;
    } catch (err) {
      setError(toFriendlyError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeServiceId, serviceQueue]);

  const submitUserMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim() || loading) return;
      const trimmed = text.trim();
      setMessages((prev) => [...prev, createMessage("user", trimmed)]);
      setLoading(true);
      setError(null);
      try {
        const result = await sendMessage(sessionId, trimmed);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", result.reply),
        ]);
        setProgress(result.progress);
        setCompleted(result.completed);
        setBackendHealth("ready");
        if (result.completed && serviceQueue.length > 1) {
          const next = serviceQueue[1];
          setMessages((prev) => [
            ...prev,
            createMessage(
              "assistant",
              "Great — moving to the next service assessment."
            ),
          ]);
          setServiceQueue((q) => q.slice(1));
          setActiveServiceId(next);
          const nextSession = await startSession(next);
          setSessionId(nextSession.session_id);
          setMessages((prev) => [
            ...prev,
            createMessage("assistant", nextSession.reply),
          ]);
          setProgress(nextSession.progress);
          setCompleted(false);
        }
      } catch (err) {
        setError(toFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, serviceQueue]
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
    const ids = options?.serviceIds ?? [];
    setServiceQueue(ids);
    setActiveServiceId(ids[0] ?? "");
    void refreshHealth();
  }, [options?.serviceIds?.join(","), refreshHealth]);

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
    submitUserMessage,
    executeAssessment,
    clearAssessment,
    resetSession,
    refreshHealth,
  };
}
