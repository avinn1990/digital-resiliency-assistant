import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../auth/authApi";
import { isGoogleAuthConfigured } from "../auth/googleClientId";
import {
  clearAuthSession,
  loadAuthToken,
  saveAuthSession,
} from "../auth/storage";
import type { AuthUser } from "../auth/types";
import { toFriendlyError } from "../lib/userMessages";
import { listEvaluationServices } from "./api";
import { createAssessmentId } from "./id";
import { DashboardPage } from "./pages/DashboardPage";
import { deleteDraft, listUserDrafts, loadDraft, saveDraft } from "./storage";
import type { AssessmentDraft, EvaluationServiceSummary, UserProfile } from "./types";
import { QuestionnairePage } from "./pages/QuestionnairePage";
import { ServicesPage } from "./pages/ServicesPage";
import { SplashAuthPage } from "./pages/SplashAuthPage";
import { SummaryPage } from "./pages/SummaryPage";
import { UserProfilePage } from "./pages/UserProfilePage";

type AppState = {
  authToken: string;
  authUser: AuthUser | null;
  authReady: boolean;
  services: EvaluationServiceSummary[];
  servicesError: string | null;
  loadingServices: boolean;
  profile: UserProfile | null;
  selectedServiceIds: string[];
  activeAssessmentId: string | null;
  draftRevision: number;
};

const DEFAULT_STATE: AppState = {
  authToken: "",
  authUser: null,
  authReady: false,
  services: [],
  servicesError: null,
  loadingServices: false,
  profile: null,
  selectedServiceIds: [],
  activeAssessmentId: null,
  draftRevision: 0,
};

function nowIso() {
  return new Date().toISOString();
}

function usernameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim() ?? "";
  return localPart || email;
}

export function AssessmentFlowApp() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const navigate = useNavigate();
  const googleAuthConfigured = isGoogleAuthConfigured();

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const authToken = loadAuthToken();

      if (!authToken) {
        if (!cancelled) {
          setState((s) => ({ ...s, authToken: "", authUser: null, authReady: true }));
        }
        return;
      }

      try {
        const user = await fetchCurrentUser(authToken);
        if (cancelled) return;
        saveAuthSession(authToken, user);
        setState((s) => ({ ...s, authToken, authUser: user, authReady: true }));
      } catch {
        if (cancelled) return;
        clearAuthSession();
        setState((s) => ({ ...s, authToken: "", authUser: null, authReady: true }));
      }
    }

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.authReady) return;
    if (googleAuthConfigured && !state.authToken) {
      setState((s) => ({
        ...s,
        services: [],
        servicesError: null,
        loadingServices: false,
      }));
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loadingServices: true, servicesError: null }));
    listEvaluationServices(state.authToken)
      .then((services) => {
        if (cancelled) return;
        setState((s) => ({ ...s, services, loadingServices: false }));
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          services: [],
          servicesError: toFriendlyError(err),
          loadingServices: false,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [state.authReady, state.authToken, googleAuthConfigured]);

  const allRoles = useMemo(() => {
    const seen = new Set<string>();
    const roles: string[] = [];
    for (const svc of state.services) {
      for (const role of svc.target_audience ?? []) {
        const trimmed = String(role ?? "").trim();
        if (!trimmed) continue;
        if (seen.has(trimmed.toLowerCase())) continue;
        seen.add(trimmed.toLowerCase());
        roles.push(trimmed);
      }
    }
    return roles.sort((a, b) => a.localeCompare(b));
  }, [state.services]);

  const userDrafts = useMemo(
    () => listUserDrafts(state.authUser?.email),
    [state.authUser?.email, state.draftRevision, state.activeAssessmentId]
  );

  const activeDraft = useMemo(() => {
    if (!state.activeAssessmentId) return null;
    return loadDraft(state.activeAssessmentId);
  }, [state.activeAssessmentId]);

  const profileDefaults = useMemo(() => {
    if (!state.authUser) return undefined;
    return {
      username: usernameFromEmail(state.authUser.email),
      fullName: state.authUser.name,
    };
  }, [state.authUser]);

  function bumpDraftRevision() {
    setState((s) => ({ ...s, draftRevision: s.draftRevision + 1 }));
  }

  function handleSignedIn(token: string, user: AuthUser) {
    saveAuthSession(token, user);
    setState((s) => ({ ...s, authToken: token, authUser: user }));
    navigate("/dashboard", { replace: true });
  }

  function handleSignOut() {
    clearAuthSession();
    setState((s) => ({
      ...s,
      authToken: "",
      authUser: null,
      services: [],
      servicesError: null,
      profile: null,
      activeAssessmentId: null,
    }));
    navigate("/", { replace: true });
  }

  function startNewDraft(profile: UserProfile, selectedServiceIds: string[]) {
    const assessmentId = createAssessmentId({
      company: profile.company,
      role: profile.role,
      username: profile.username,
    });

    const draft: AssessmentDraft = {
      assessmentId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      authToken: state.authToken || undefined,
      ownerEmail: state.authUser?.email,
      profile,
      selectedServiceIds,
      currentServiceId: selectedServiceIds[0],
      responsesByService: Object.fromEntries(
        selectedServiceIds.map((id) => [id, { responses: {} }])
      ),
    };
    saveDraft(draft);
    setState((s) => ({
      ...s,
      profile,
      selectedServiceIds,
      activeAssessmentId: assessmentId,
      draftRevision: s.draftRevision + 1,
    }));
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/services`, {
      replace: true,
    });
  }

  function openDraft(assessmentId: string) {
    const draft = loadDraft(assessmentId);
    if (!draft) return;
    setState((s) => ({
      ...s,
      profile: draft.profile,
      selectedServiceIds: draft.selectedServiceIds,
      activeAssessmentId: draft.assessmentId,
      authToken: draft.authToken ?? s.authToken,
    }));
  }

  function resumeDraft(assessmentId: string) {
    openDraft(assessmentId);
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/questions`, {
      replace: true,
    });
  }

  function viewSummary(assessmentId: string) {
    openDraft(assessmentId);
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/summary`, {
      replace: true,
    });
  }

  function discardDraft(assessmentId: string) {
    deleteDraft(assessmentId);
    if (state.activeAssessmentId === assessmentId) {
      setState((s) => ({
        ...s,
        profile: null,
        selectedServiceIds: [],
        activeAssessmentId: null,
        draftRevision: s.draftRevision + 1,
      }));
    } else {
      bumpDraftRevision();
    }
  }

  const isAuthenticated = Boolean(state.authToken);

  return (
    <Routes>
      <Route
        path="/"
        element={
          !state.authReady ? null : isAuthenticated && googleAuthConfigured ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SplashAuthPage onSignedIn={handleSignedIn} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          !state.authReady ? null : googleAuthConfigured && !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <DashboardPage
              authUser={state.authUser}
              drafts={userDrafts}
              servicesLoading={!state.authReady || state.loadingServices}
              servicesError={state.servicesError}
              servicesCount={state.services.length}
              onStartNew={() => navigate("/profile")}
              onResume={resumeDraft}
              onViewSummary={viewSummary}
              onDiscard={discardDraft}
              onSignOut={handleSignOut}
            />
          )
        }
      />

      <Route
        path="/profile"
        element={
          googleAuthConfigured && !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <UserProfilePage
              roles={allRoles}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              initialProfile={profileDefaults}
              onNext={(profile) => {
                setState((s) => ({ ...s, profile }));
                navigate("/select-services");
              }}
            />
          )
        }
      />

      <Route
        path="/select-services"
        element={
          state.profile ? (
            <ServicesPage
              profile={state.profile}
              services={state.services}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              onConfirm={(selectedServiceIds) => startNewDraft(state.profile!, selectedServiceIds)}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/assessment/:assessmentId/services"
        element={
          activeDraft ? (
            <ServicesPage
              profile={activeDraft.profile}
              services={state.services}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              initialSelectedServiceIds={activeDraft.selectedServiceIds}
              onConfirm={(selectedServiceIds) => startNewDraft(activeDraft.profile, selectedServiceIds)}
              allowBackToDashboard
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/assessment/:assessmentId/questions"
        element={
          activeDraft ? (
            <QuestionnairePage
              draft={activeDraft}
              services={state.services}
              authToken={state.authToken}
              onDraftChange={(nextDraft) => {
                const draftWithOwner: AssessmentDraft = {
                  ...nextDraft,
                  ownerEmail: nextDraft.ownerEmail ?? state.authUser?.email,
                  authToken: nextDraft.authToken ?? (state.authToken || undefined),
                };
                saveDraft(draftWithOwner);
                setState((s) => ({
                  ...s,
                  activeAssessmentId: draftWithOwner.assessmentId,
                  draftRevision: s.draftRevision + 1,
                }));
              }}
              onFinish={() =>
                navigate(`/assessment/${encodeURIComponent(activeDraft.assessmentId)}/summary`)
              }
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/assessment/:assessmentId/summary"
        element={
          activeDraft ? (
            <SummaryPage
              draft={activeDraft}
              services={state.services}
              onDiscard={() => {
                discardDraft(activeDraft.assessmentId);
                navigate("/dashboard", { replace: true });
              }}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
