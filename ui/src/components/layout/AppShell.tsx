import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createAssessment,
  getAssessment,
  updateAssessment,
  uploadArtifact,
} from "../../assessmentFlow/assessmentsApi";
import { listEvaluationServices } from "../../assessmentFlow/api";
import { serviceDisplayName } from "../../assessmentFlow/roles";
import type { AssessmentDraft, EvaluationServiceSummary } from "../../assessmentFlow/types";
import { clearProfile, isSignedIn, signOut } from "../../auth/accountActions";
import { fetchUserProfile } from "../../auth/profileApi";
import { loadAuthToken, loadAuthUser } from "../../auth/storage";
import { useChatSession } from "../../hooks/useChatSession";
import { buildChatDraft, aggregatePendingArtifacts } from "../../lib/chatDraft";
import { ARTIFACT_RETENTION_NOTICE } from "../../lib/artifactUtils";
import {
  buildChatPath,
  parseChatSearchParams,
  type ChatLocationState,
} from "../../lib/chatNavigation";
import { formatTimeEstimate } from "../../lib/engagementUtils";
import { getCurrentStep, ENGAGEMENT_COPY, toFriendlyError } from "../../lib/userMessages";
import { canReachBackend } from "../../services/health";
import { AssessmentPanel } from "../assessment/AssessmentPanel";
import { EngagementBanner } from "../chat/EngagementBanner";
import { ChatHeader } from "../chat/ChatHeader";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { ServiceCompletionPreview } from "../chat/ServiceCompletionPreview";
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

  const autosaveTimerRef = useRef<number | null>(null);
  const lastAutosavedCountRef = useRef(0);
  const ensureDraftSavedRef = useRef<(() => Promise<unknown>) | null>(null);
  const activeServiceNameRef = useRef("");

  const chat = useChatSession({
    serviceIds,
    activeServiceId: urlActiveServiceId,
    activeServiceNameRef,
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
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
    if (match) return serviceDisplayName(match);
    if (chat.activeServiceId) {
      return serviceDisplayName({ service_id: chat.activeServiceId });
    }
    return "";
  }, [services, chat.activeServiceId]);

  activeServiceNameRef.current = activeServiceName;

  const completedServiceDisplayName = useMemo(() => {
    const id = chat.pendingServiceTransition?.completedServiceId;
    if (!id) return "";
    const match = services.find((service) => service.service_id === id);
    if (match) return serviceDisplayName(match);
    return serviceDisplayName({ service_id: id });
  }, [services, chat.pendingServiceTransition?.completedServiceId]);

  const serviceIndex = chat.completedServiceIds.length + 1;
  const serviceTotal = chat.completedServiceIds.length + chat.serviceQueue.length;
  const remainingCapabilities = Math.max(
    chat.progress.total - chat.progress.current,
    0
  );
  const timeEstimate = formatTimeEstimate(remainingCapabilities);

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
  const currentStep = getCurrentStep(
    chat.sessionId,
    Boolean(chat.assessment),
    chat.allServicesCompleted
  );

  const statusMessage = chat.loading
    ? "Loading, please wait."
    : finishing
      ? "Finishing your assessment."
      : uploading
        ? "Uploading your file."
        : chat.error
          ? chat.error
          : draftError
            ? draftError
            : saveMessage ?? "";

  const ensureDraftSaved = useCallback(async () => {
    const authToken = loadAuthToken();
    const authUser = loadAuthUser();
    if (!authToken || !authUser) {
      throw new Error("Sign in from your dashboard to save progress.");
    }

    const onboarding = await fetchUserProfile(authToken);
    if (!onboarding) {
      throw new Error("Complete onboarding before saving your assessment.");
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
    return { saved, authToken };
  }, [chat, draftId, savedDraft, serviceIds, navigate]);

  ensureDraftSavedRef.current = () => ensureDraftSaved();

  useEffect(() => {
    if (!signedIn || !chat.sessionId || chat.messages.length === 0) return;
    if (chat.loading) return;
    if (lastAutosavedCountRef.current === chat.messages.length) return;
    lastAutosavedCountRef.current = chat.messages.length;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      void ensureDraftSavedRef
        .current?.()
        .then(() => setSaveMessage(ENGAGEMENT_COPY.autosaveSaved))
        .catch(() => {
          /* manual save still available */
        });
    }, 400);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [signedIn, chat.sessionId, chat.messages.length, chat.loading]);

  const handleSaveProgress = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await ensureDraftSaved();
      setSaveMessage("Progress saved. You can continue later from your dashboard.");
    } catch (err) {
      setSaveMessage(toFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }, [ensureDraftSaved]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      setSaveMessage(null);
      try {
        const { saved, authToken } = await ensureDraftSaved();
        const uploaded: Array<{ fileId: string; fileName: string }> = [];
        let latestDraft = saved;

        for (const file of files) {
          const result = await uploadArtifact(saved.assessmentId, authToken, file, {
            serviceId: chat.activeServiceId,
            capabilityId: chat.assessmentFocus?.capability_id,
          });
          uploaded.push({ fileId: result.artifact.id, fileName: result.artifact.fileName });
          latestDraft = {
            ...latestDraft,
            pendingArtifacts: result.pendingArtifacts,
            uploadedArtifacts: result.uploadedArtifacts,
          };
        }

        setSavedDraft(latestDraft);
        const names = uploaded.map((item) => item.fileName).join(", ");
        chat.appendUserMessage(`Uploaded: ${names}`, uploaded);
        setSaveMessage(`Uploaded ${names}. ${ARTIFACT_RETENTION_NOTICE}`);
      } catch (err) {
        setSaveMessage(toFriendlyError(err));
      } finally {
        setUploading(false);
      }
    },
    [chat, ensureDraftSaved]
  );

  const handleFinishAssessment = useCallback(async () => {
    setFinishing(true);
    setSaveMessage(null);
    try {
      const { saved, authToken } = await ensureDraftSaved();
      const pendingArtifacts = aggregatePendingArtifacts(
        chat.getSnapshot(),
        saved.pendingArtifacts ?? []
      );
      const finishedDraft = buildChatDraft({
        assessmentId: saved.assessmentId,
        profile: saved.profile,
        ownerEmail: saved.ownerEmail,
        selectedServiceIds: serviceIds,
        snapshot: chat.getSnapshot(),
        existingDraft: saved,
        pendingArtifacts,
        uploadedArtifacts: saved.uploadedArtifacts,
      });
      const persisted = await updateAssessment(
        finishedDraft.assessmentId,
        finishedDraft,
        authToken
      );
      navigate(`/assessment/${encodeURIComponent(persisted.assessmentId)}/artifacts`, {
        replace: true,
      });
    } catch (err) {
      setSaveMessage(toFriendlyError(err));
    } finally {
      setFinishing(false);
    }
  }, [chat, ensureDraftSaved, navigate, serviceIds]);

  const milestoneMessage = chat.milestoneBanner;

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
        serviceIndex={serviceIndex}
        serviceTotal={serviceTotal}
        timeEstimate={timeEstimate}
        topicProgress={chat.engagementMeta.capability_topic_progress}
        pillarProgress={chat.engagementMeta.pillar_progress}
        onNewChat={() => {
          chat.resetSession();
          setSavedDraft(null);
          setSaveMessage(null);
          lastAutosavedCountRef.current = 0;
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
        {milestoneMessage && (
          <EngagementBanner
            message={milestoneMessage}
            onDismiss={chat.dismissMilestoneBanner}
          />
        )}
        {chat.pillarBanner && (
          <EngagementBanner
            message={chat.pillarBanner}
            onDismiss={chat.dismissPillarBanner}
          />
        )}

        {!chat.sessionId ? (
          waitingToResume ? (
            <section className="welcome-panel" aria-busy="true">
              <h2>Restoring Your Assessment</h2>
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
              <h2>Starting Your Assessment</h2>
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
        ) : chat.pendingServiceTransition ? (
          <ServiceCompletionPreview
            serviceName={completedServiceDisplayName}
            capabilitiesAssessed={chat.pendingServiceTransition.capabilitiesAssessed}
            pendingArtifactCount={chat.pendingServiceTransition.pendingArtifactCount}
            servicesRemaining={chat.pendingServiceTransition.servicesRemaining}
            assessmentResult={chat.pendingServiceTransition.assessmentResult}
            assessing={chat.pendingServiceTransition.assessing}
            onContinue={chat.continueToNextService}
          />
        ) : (
          <>
            <ChatWorkspace
              messages={chat.messages}
              loading={chat.loading}
              completed={chat.completed}
              onSend={chat.submitUserMessage}
              onUploadFiles={signedIn ? handleUploadFiles : undefined}
              uploading={uploading}
              onFinishAssessment={() => {
                void handleFinishAssessment();
              }}
              finishing={finishing}
              canSave={signedIn && chat.messages.length > 0}
              saving={saving}
              saveMessage={saveMessage}
              saveLabel={
                chat.completed
                  ? ENGAGEMENT_COPY.saveProgress
                  : ENGAGEMENT_COPY.saveAndBreak
              }
              onSave={() => {
                void handleSaveProgress();
              }}
            />
            {chat.assessment && chat.allServicesCompleted && (
              <AssessmentPanel result={chat.assessment} />
            )}
          </>
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
