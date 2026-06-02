import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createAssessment,
  getAssessment,
  updateAssessment,
} from "../../assessmentFlow/assessmentsApi";
import { listEvaluationServices } from "../../assessmentFlow/api";
import type { AssessmentDraft, EvaluationServiceSummary } from "../../assessmentFlow/types";
import { clearProfile, isSignedIn, signOut } from "../../auth/accountActions";
import { fetchUserProfile } from "../../auth/profileApi";
import { loadAuthToken, loadAuthUser } from "../../auth/storage";
import { useChatSession } from "../../hooks/useChatSession";
import { buildChatDraft } from "../../lib/chatDraft";
import {
  buildChatPath,
  parseChatSearchParams,
  type ChatLocationState,
} from "../../lib/chatNavigation";
import { getCurrentStep, toFriendlyError } from "../../lib/userMessages";
import { canReachBackend } from "../../services/health";
import { AssessmentPanel } from "../assessment/AssessmentPanel";
import { ChatHeader } from "../chat/ChatHeader";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { StatusAnnouncer } from "../common/StatusAnnouncer";
import { WelcomePanel } from "../setup/WelcomePanel";

function usernameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim() ?? "";
  return localPart || email;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const startChatRequested =
    (location.state as ChatLocationState | null)?.startChat === true;
  const startHandledRef = useRef(false);
  const resumeHandledRef = useRef(false);

  const { serviceIds, activeServiceId: urlActiveServiceId } = useMemo(
    () => parseChatSearchParams(location.search),
    [location.search]
  );

  const draftId = useMemo(() => {
    return new URLSearchParams(location.search).get("draft")?.trim() ?? "";
  }, [location.search]);

  const chat = useChatSession({
    serviceIds,
    activeServiceId: urlActiveServiceId,
    onActiveServiceChange: (nextActive) => {
      navigate(buildChatPath(serviceIds, draftId, nextActive), {
        replace: true,
        state: location.state,
      });
    },
  });
  const [services, setServices] = useState<EvaluationServiceSummary[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [savedDraft, setSavedDraft] = useState<AssessmentDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(Boolean(draftId));
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setServicesLoading(true);
    listEvaluationServices(loadAuthToken() || undefined)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    startHandledRef.current = false;
    resumeHandledRef.current = false;
  }, [location.key]);

  useEffect(() => {
    if (!draftId || !signedIn) {
      setDraftLoading(false);
      return;
    }

    const authToken = loadAuthToken();
    if (!authToken) {
      setDraftLoading(false);
      return;
    }

    let cancelled = false;
    setDraftLoading(true);
    setDraftError(null);

    getAssessment(draftId, authToken)
      .then((draft) => {
        if (cancelled) return;
        if (!draft.chatState) {
          setDraftError("This saved assessment cannot be resumed in chat.");
          return;
        }
        setSavedDraft(draft);
      })
      .catch((err) => {
        if (cancelled) return;
        setDraftError(toFriendlyError(err));
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draftId, signedIn]);

  useEffect(() => {
    if (!draftId || !savedDraft?.chatState || resumeHandledRef.current) return;
    if (chat.sessionId || chat.loading) return;
    if (!canReachBackend(chat.connectionStatus)) return;

    resumeHandledRef.current = true;
    void chat.restoreFromChatState(savedDraft.chatState).then((restored) => {
      if (restored) {
        navigate(
          buildChatPath(serviceIds, draftId, chat.activeServiceId),
          { replace: true, state: {} }
        );
      } else {
        resumeHandledRef.current = false;
      }
    });
  }, [
    draftId,
    savedDraft,
    chat.sessionId,
    chat.loading,
    chat.connectionStatus,
    chat.restoreFromChatState,
    serviceIds,
    navigate,
  ]);

  useEffect(() => {
    if (draftId) return;
    if (!startChatRequested || startHandledRef.current) return;
    if (chat.sessionId || chat.loading) return;
    if (serviceIds.length === 0) return;
    if (!canReachBackend(chat.connectionStatus)) return;

    startHandledRef.current = true;
    void chat.beginSession().then((started) => {
      if (started) {
        navigate(
          buildChatPath(serviceIds, undefined, chat.activeServiceId),
          { replace: true, state: {} }
        );
      } else {
        startHandledRef.current = false;
      }
    });
  }, [
    draftId,
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
    !draftId &&
    startChatRequested &&
    !chat.sessionId &&
    serviceIds.length > 0 &&
    !chat.error;
  const waitingToResume =
    Boolean(draftId) &&
    !chat.sessionId &&
    (draftLoading || Boolean(savedDraft?.chatState)) &&
    !draftError &&
    !chat.error;
  const currentStep = getCurrentStep(chat.sessionId, !!chat.assessment);

  const statusMessage = chat.loading
    ? "Loading, please wait."
    : chat.assessing
      ? "Running your assessment."
      : chat.error
        ? chat.error
        : draftError
          ? draftError
          : chat.assessment
            ? `Assessment complete. Overall score ${chat.assessment.overall_score} out of 100.`
            : saveMessage ?? "";

  const handleSaveProgress = useCallback(async () => {
    const authToken = loadAuthToken();
    const authUser = loadAuthUser();
    if (!authToken || !authUser) {
      setSaveMessage("Sign in from your dashboard to save progress.");
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const onboarding = await fetchUserProfile(authToken);
      if (!onboarding) {
        setSaveMessage("Complete onboarding before saving your assessment.");
        return;
      }

      const profile = {
        username: usernameFromEmail(authUser.email),
        fullName: authUser.name,
        company: onboarding.company,
        role: onboarding.role,
      };

      const draft = buildChatDraft({
        assessmentId: savedDraft?.assessmentId ?? (draftId || undefined),
        profile,
        ownerEmail: authUser.email,
        selectedServiceIds: serviceIds,
        snapshot: chat.getSnapshot(),
        existingDraft: savedDraft,
      });

      const saved =
        savedDraft || draftId
          ? await updateAssessment(draft.assessmentId, draft, authToken)
          : await (async () => {
              try {
                return await createAssessment(draft, authToken);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (/409|already exists/i.test(message)) {
                  return updateAssessment(draft.assessmentId, draft, authToken);
                }
                throw err;
              }
            })();

      setSavedDraft(saved);
      if (!draftId) {
        navigate(
          buildChatPath(serviceIds, saved.assessmentId, chat.activeServiceId),
          { replace: true, state: {} }
        );
      }
      setSaveMessage("Progress saved. You can continue later from your dashboard.");
    } catch (err) {
      setSaveMessage(toFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }, [chat, draftId, savedDraft, serviceIds, navigate]);

  return (
    <div className="app-shell">
      <ChatHeader
        serviceName={activeServiceName}
        sessionId={chat.sessionId}
        currentStep={currentStep}
        progress={chat.progress}
        assessmentFocus={chat.assessmentFocus}
        completed={chat.completed}
        connectionStatus={chat.connectionStatus}
        onNewChat={() => {
          chat.resetSession();
          setSavedDraft(null);
          setSaveMessage(null);
          navigate(
          buildChatPath(serviceIds, undefined, chat.activeServiceId),
          { replace: true, state: {} }
        );
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
          waitingToResume ? (
            <section className="welcome-panel" aria-busy="true">
              <h2>Restoring your assessment</h2>
              <p className="context-help">
                {draftLoading
                  ? "Loading your saved progress…"
                  : chat.loading
                    ? "Reconnecting to your chat…"
                    : !canReachBackend(chat.connectionStatus)
                      ? "Waiting for the API to be ready…"
                      : "Preparing your chat…"}
              </p>
            </section>
          ) : waitingToStart ? (
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
              error={chat.error ?? draftError}
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
              canSave={signedIn && chat.messages.length > 0}
              saving={saving}
              saveMessage={saveMessage}
              onSave={() => {
                void handleSaveProgress();
              }}
            />
            {chat.assessment && (
              <AssessmentPanel
                result={chat.assessment}
                onDismiss={chat.clearAssessment}
              />
            )}
          </div>
        )}
        {(chat.sessionId && chat.error) || draftError ? (
          <div className="error-banner floating" role="alert">
            <strong>Something went wrong.</strong> {chat.error ?? draftError}
          </div>
        ) : null}
      </main>
    </div>
  );
}
