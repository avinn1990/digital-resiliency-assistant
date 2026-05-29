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
import { deleteDraft, listDrafts, loadDraft, saveDraft } from "./storage";
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

  const draftIndex = useMemo(() => listDrafts(), [state.activeAssessmentId]);
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

  function handleSignedIn(token: string, user: AuthUser) {
    saveAuthSession(token, user);
    setState((s) => ({ ...s, authToken: token, authUser: user }));
  }

  function handleSignOut() {
    clearAuthSession();
    setState((s) => ({
      ...s,
      authToken: "",
      authUser: null,
      services: [],
      servicesError: null,
    }));
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
    }));
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/services`, {
      replace: true,
    });
  }

  function resumeDraft(assessmentId: string) {
    const draft = loadDraft(assessmentId);
    if (!draft) return;
    setState((s) => ({
      ...s,
      profile: draft.profile,
      selectedServiceIds: draft.selectedServiceIds,
      activeAssessmentId: draft.assessmentId,
      authToken: draft.authToken ?? s.authToken,
    }));
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/questions`, {
      replace: true,
    });
  }

  function discardDraft(assessmentId: string) {
    deleteDraft(assessmentId);
    if (state.activeAssessmentId === assessmentId) {
      setState((s) => ({
        ...DEFAULT_STATE,
        authToken: s.authToken,
        authUser: s.authUser,
        authReady: true,
      }));
      navigate("/", { replace: true });
    } else {
      setState((s) => ({ ...s, activeAssessmentId: s.activeAssessmentId }));
    }
  }

  const isAuthenticated = Boolean(state.authToken);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <SplashAuthPage
            authUser={state.authUser}
            isAuthenticated={isAuthenticated}
            onSignedIn={handleSignedIn}
            onSignOut={handleSignOut}
            drafts={draftIndex}
            onResume={resumeDraft}
            onDiscard={discardDraft}
            servicesLoading={!state.authReady || state.loadingServices}
            servicesError={state.servicesError}
            servicesCount={state.services.length}
            onStart={() => navigate("/profile")}
          />
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
            <Navigate to="/profile" replace />
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
              allowBackToSplash
            />
          ) : (
            <Navigate to="/" replace />
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
                saveDraft(nextDraft);
                setState((s) => ({ ...s, activeAssessmentId: nextDraft.assessmentId }));
              }}
              onFinish={() =>
                navigate(`/assessment/${encodeURIComponent(activeDraft.assessmentId)}/summary`)
              }
            />
          ) : (
            <Navigate to="/" replace />
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
              onDiscard={() => discardDraft(activeDraft.assessmentId)}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
