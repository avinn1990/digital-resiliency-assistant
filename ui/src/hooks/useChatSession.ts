import { useCallback, useEffect, useState } from "react";
import { toFriendlyError } from "../lib/userMessages";
import {
  checkBackendHealth,
  listFrameworks,
  runAssessment,
  sendMessage,
  startSession,
} from "../services/agentApi";
import type {
  AssessmentResult,
  ChatMessage,
  FrameworkSummary,
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

export function useChatSession() {
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<SessionProgress>({ current: 0, total: 0 });
  const [completed, setCompleted] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [frameworksLoading, setFrameworksLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const refreshHealth = useCallback(async () => {
    const ok = await checkBackendHealth();
    setBackendOnline(ok);
    return ok;
  }, []);

  useEffect(() => {
    refreshHealth();
    setFrameworksLoading(true);
    listFrameworks()
      .then((items) => {
        setFrameworks(items);
        if (items.length > 0) {
          setSelectedFrameworkId(items[0].id);
        }
      })
      .catch((err) => setError(toFriendlyError(err)))
      .finally(() => setFrameworksLoading(false));
  }, [refreshHealth]);

  useEffect(() => {
    if (backendOnline !== false) return undefined;
    const intervalId = window.setInterval(() => {
      void refreshHealth();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [backendOnline, refreshHealth]);

  const beginSession = useCallback(async () => {
    if (!selectedFrameworkId) return;
    setLoading(true);
    setError(null);
    setAssessment(null);
    setMessages([]);
    setSessionId(null);
    try {
      const result = await startSession(selectedFrameworkId);
      setSessionId(result.session_id);
      setMessages([createMessage("assistant", result.reply)]);
      setProgress(result.progress);
      setCompleted(false);
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedFrameworkId, refreshHealth]);

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
      } catch (err) {
        setError(toFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading]
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
  }, []);

  const selectedFramework = frameworks.find((f) => f.id === selectedFrameworkId);

  return {
    frameworks,
    selectedFrameworkId,
    setSelectedFrameworkId,
    selectedFramework,
    sessionId,
    messages,
    progress,
    completed,
    assessment,
    loading,
    frameworksLoading,
    assessing,
    error,
    backendOnline,
    beginSession,
    submitUserMessage,
    executeAssessment,
    clearAssessment,
    resetSession,
    refreshHealth,
  };
}
