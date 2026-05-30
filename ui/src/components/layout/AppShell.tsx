import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listEvaluationServices } from "../../assessmentFlow/api";
import type { EvaluationServiceSummary } from "../../assessmentFlow/types";
import { clearProfile, isSignedIn, signOut } from "../../auth/accountActions";
import { loadAuthToken } from "../../auth/storage";
import { useChatSession } from "../../hooks/useChatSession";
import {
  buildChatPath,
  type ChatLocationState,
} from "../../lib/chatNavigation";
import { getCurrentStep } from "../../lib/userMessages";
import { canReachBackend } from "../../services/health";
import { AssessmentPanel } from "../assessment/AssessmentPanel";
import { ChatHeader } from "../chat/ChatHeader";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { StatusAnnouncer } from "../common/StatusAnnouncer";
import { WelcomePanel } from "../setup/WelcomePanel";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const startChatRequested =
    (location.state as ChatLocationState | null)?.startChat === true;
  const startHandledRef = useRef(false);

  const serviceIds = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("services") ?? "";
    return raw
      .split(",")
      .map((s) => decodeURIComponent(s).trim())
      .filter(Boolean);
  }, [location.search]);

  const chat = useChatSession({ serviceIds });
  const [services, setServices] = useState<EvaluationServiceSummary[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    setServicesLoading(true);
    listEvaluationServices(loadAuthToken() || undefined)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    startHandledRef.current = false;
  }, [location.key]);

  useEffect(() => {
    if (!startChatRequested || startHandledRef.current) return;
    if (chat.sessionId || chat.loading) return;
    if (serviceIds.length === 0) return;
    if (!canReachBackend(chat.connectionStatus)) return;

    startHandledRef.current = true;
    void chat.beginSession().then((started) => {
      if (started) {
        navigate(buildChatPath(serviceIds), { replace: true, state: {} });
      } else {
        startHandledRef.current = false;
      }
    });
  }, [
    startChatRequested,
    chat.sessionId,
    chat.loading,
    chat.connectionStatus,
    chat.beginSession,
    serviceIds,
    navigate,
  ]);

  const activeServiceName = useMemo(() => {
    const match = services.find((service) => service.service_id === chat.activeServiceId);
    return match?.service_name ?? chat.activeServiceId;
  }, [services, chat.activeServiceId]);

  const waitingToStart =
    startChatRequested && !chat.sessionId && serviceIds.length > 0 && !chat.error;
  const currentStep = getCurrentStep(chat.sessionId, !!chat.assessment);

  const statusMessage = chat.loading
    ? "Loading, please wait."
    : chat.assessing
      ? "Running your assessment."
      : chat.error
        ? chat.error
        : chat.assessment
          ? `Assessment complete. Overall score ${chat.assessment.overall_score} out of 100.`
          : "";

  return (
    <div className="app-shell">
      <ChatHeader
        serviceName={activeServiceName}
        sessionId={chat.sessionId}
        currentStep={currentStep}
        progress={chat.progress}
        completed={chat.completed}
        connectionStatus={chat.connectionStatus}
        onNewChat={() => {
          chat.resetSession();
          navigate(buildChatPath(serviceIds), { replace: true, state: {} });
        }}
        onRetryHealth={chat.refreshHealth}
        signedIn={signedIn}
        onSignOut={() => {
          signOut();
          navigate("/", { replace: true });
        }}
        onClearProfile={() => {
          void clearProfile().then(() => {
            navigate("/onboarding", { replace: true });
          });
        }}
        onOpenWorkspace={() => navigate("/dashboard")}
      />

      <StatusAnnouncer message={statusMessage} />

      <main id="main-content" className="app-main" tabIndex={-1}>
        {!chat.sessionId ? (
          waitingToStart ? (
            <section className="welcome-panel" aria-busy="true">
              <h2>Starting your assessment</h2>
              <p className="context-help">
                {chat.loading
                  ? "Connecting to the assessment chat…"
                  : !canReachBackend(chat.connectionStatus)
                    ? "Waiting for the API to be ready…"
                    : "Preparing your chat…"}
              </p>
            </section>
          ) : (
            <WelcomePanel
              serviceIds={serviceIds}
              services={services}
              servicesLoading={servicesLoading}
              onStart={() => {
                void chat.beginSession();
              }}
              loading={chat.loading}
              backendHealth={chat.connectionStatus}
              onRetryHealth={chat.refreshHealth}
              error={chat.error}
            />
          )
        ) : (
          <div className="app-main-split">
            <ChatWorkspace
              messages={chat.messages}
              loading={chat.loading}
              completed={chat.completed}
              onSend={chat.submitUserMessage}
              onRunAssessment={chat.executeAssessment}
              assessmentLoading={chat.assessing}
            />
            {chat.assessment && (
              <AssessmentPanel
                result={chat.assessment}
                onDismiss={chat.clearAssessment}
              />
            )}
          </div>
        )}
        {chat.sessionId && chat.error && (
          <div className="error-banner floating" role="alert">
            <strong>Something went wrong.</strong> {chat.error}
          </div>
        )}
      </main>
    </div>
  );
}
