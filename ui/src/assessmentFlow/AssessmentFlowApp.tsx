import { useEffect, useMemo, useRef, useState } from "react";
import {
  matchPath,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { fetchCurrentUser } from "../auth/authApi";
import { clearProfile, signOut } from "../auth/accountActions";
import { isGoogleAuthConfigured } from "../auth/googleClientId";
import {
  fetchUserProfile,
  saveUserProfile,
  type UserOnboardingProfile,
} from "../auth/profileApi";
import {
  loadAuthToken,
  loadAuthUser,
  loadSelectedServiceIds,
  saveAuthSession,
  saveSelectedServiceIds,
} from "../auth/storage";
import type { AuthUser } from "../auth/types";
import { toFriendlyError } from "../lib/userMessages";
import { buildChatPath, chatLocationState } from "../lib/chatNavigation";
import { chatDraftResumePath } from "../lib/chatDraft";
import {
  createAssessment,
  deleteAssessment,
  getAssessment,
  listAssessments,
  updateAssessment,
  type UserDraftSummary,
} from "./assessmentsApi";
import { listEvaluationServices } from "./api";
import { createAssessmentId } from "./id";
import { DashboardPage } from "./pages/DashboardPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import type { AssessmentDraft, EvaluationServiceSummary, UserProfile } from "./types";
import { collectRoles, servicesForRole } from "./roles";
import { isChatAssessmentDraft } from "./draftUtils";
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
  onboardingProfile: UserOnboardingProfile | null;
  onboardingReady: boolean;
  selectedServiceIds: string[];
  assessments: UserDraftSummary[];
  assessmentsLoading: boolean;
  assessmentsError: string | null;
  activeAssessmentId: string | null;
  activeDraft: AssessmentDraft | null;
  activeDraftLoading: boolean;
  saveError: string | null;
};

const DEFAULT_STATE: AppState = {
  authToken: "",
  authUser: null,
  authReady: false,
  services: [],
  servicesError: null,
  loadingServices: false,
  profile: null,
  onboardingProfile: null,
  onboardingReady: false,
  selectedServiceIds: [],
  assessments: [],
  assessmentsLoading: false,
  assessmentsError: null,
  activeAssessmentId: null,
  activeDraft: null,
  activeDraftLoading: false,
  saveError: null,
};

function nowIso() {
  return new Date().toISOString();
}

function usernameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim() ?? "";
  return localPart || email;
}

function buildUserProfile(
  authUser: AuthUser,
  onboarding: UserOnboardingProfile
): UserProfile {
  return {
    username: usernameFromEmail(authUser.email),
    fullName: authUser.name,
    company: onboarding.company,
    role: onboarding.role,
  };
}

function postAuthPath(hasOnboarding: boolean): string {
  return hasOnboarding ? "/dashboard" : "/onboarding";
}

function AuthLoadingPage({
  message = "Loading…",
}: {
  message?: string;
}) {
  return (
    <div className="af-page">
      <div className="af-page-inner context-help">{message}</div>
    </div>
  );
}

export function AssessmentFlowApp() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const navigate = useNavigate();
  const location = useLocation();
  const googleAuthConfigured = isGoogleAuthConfigured();
  const saveTimerRef = useRef<number | null>(null);
  const authTokenRef = useRef(state.authToken);
  const profileLoadGenRef = useRef(0);

  useEffect(() => {
    authTokenRef.current = state.authToken;
  }, [state.authToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const authToken = loadAuthToken();

      if (!authToken) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            authToken: "",
            authUser: null,
            authReady: true,
            onboardingReady: true,
          }));
        }
        return;
      }

      const cachedUser = loadAuthUser();
      if (cachedUser && !cancelled) {
        const cachedSelected = loadSelectedServiceIds(cachedUser.email);
        setState((s) => ({
          ...s,
          authToken,
          authUser: cachedUser,
          authReady: true,
          selectedServiceIds: cachedSelected,
        }));
      }

      try {
        const user = await fetchCurrentUser(authToken);
        if (cancelled) return;
        saveAuthSession(authToken, user);
        const cachedSelected = loadSelectedServiceIds(user.email);
        setState((s) => ({
          ...s,
          authToken,
          authUser: user,
          authReady: true,
          selectedServiceIds: cachedSelected,
        }));
      } catch {
        if (cancelled) return;
        signOut();
        setState((s) => ({
          ...s,
          authToken: "",
          authUser: null,
          authReady: true,
          onboardingReady: true,
        }));
      }
    }

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.authReady || !state.authToken) {
      if (state.authReady) {
        setState((s) => ({ ...s, onboardingReady: true }));
      }
      return;
    }

    const token = state.authToken;
    const loadGen = ++profileLoadGenRef.current;
    let cancelled = false;
    setState((s) => ({ ...s, onboardingReady: false, assessmentsLoading: true }));

    Promise.all([fetchUserProfile(token), listAssessments(token)])
      .then(([onboardingProfile, assessments]) => {
        if (cancelled || profileLoadGenRef.current !== loadGen) return;
        setState((s) => ({
          ...s,
          onboardingProfile,
          onboardingReady: true,
          assessments,
          assessmentsLoading: false,
          assessmentsError: null,
        }));
      })
      .catch((err) => {
        if (cancelled || profileLoadGenRef.current !== loadGen) return;
        setState((s) => ({
          ...s,
          onboardingReady: true,
          assessments: [],
          assessmentsLoading: false,
          assessmentsError: toFriendlyError(err),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [state.authReady, state.authToken]);

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

  useEffect(() => {
    const match = matchPath("/assessment/:assessmentId/*", location.pathname);
    const assessmentId = match?.params?.assessmentId;
    if (!assessmentId) return;
    setState((s) =>
      s.activeAssessmentId === assessmentId
        ? s
        : { ...s, activeAssessmentId: assessmentId, activeDraft: null }
    );
  }, [location.pathname]);

  useEffect(() => {
    if (!state.activeAssessmentId || !state.authToken) return;
    if (state.activeDraft?.assessmentId === state.activeAssessmentId) return;

    let cancelled = false;
    setState((s) => ({ ...s, activeDraftLoading: true, activeDraft: null }));

    getAssessment(state.activeAssessmentId, state.authToken)
      .then((draft) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          activeDraft: draft,
          activeDraftLoading: false,
          profile: draft.profile,
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          activeDraft: null,
          activeDraftLoading: false,
          activeAssessmentId: null,
          saveError: toFriendlyError(err),
        }));
        navigate("/dashboard", { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [
    state.activeAssessmentId,
    state.authToken,
    state.activeDraft?.assessmentId,
    navigate,
  ]);

  const allRoles = useMemo(() => collectRoles(state.services), [state.services]);

  const profileDefaults = useMemo(() => {
    if (!state.authUser) return undefined;
    const base = {
      username: usernameFromEmail(state.authUser.email),
      fullName: state.authUser.name,
    };
    if (state.onboardingProfile) {
      return {
        ...base,
        company: state.onboardingProfile.company,
        role: state.onboardingProfile.role,
      };
    }
    return base;
  }, [state.authUser, state.onboardingProfile]);

  async function refreshAssessments(authToken: string) {
    const assessments = await listAssessments(authToken);
    setState((s) => ({ ...s, assessments, assessmentsError: null }));
  }

  function handleSignedIn(token: string, user: AuthUser) {
    saveAuthSession(token, user);
    setState((s) => ({
      ...s,
      authToken: token,
      authUser: user,
      authReady: true,
      onboardingReady: false,
    }));
    // Stay on splash until profile bootstrap finishes; "/" then redirects once.
  }

  async function handleOnboardingComplete(
    onboarding: UserOnboardingProfile,
    selectedServiceIds: string[]
  ) {
    if (!state.authUser || !state.authToken) return;
    const saved = await saveUserProfile(onboarding, state.authToken);
    const profile = buildUserProfile(state.authUser, saved);
    saveSelectedServiceIds(state.authUser.email, selectedServiceIds);
    setState((s) => ({
      ...s,
      onboardingProfile: saved,
      profile,
      selectedServiceIds,
    }));
    navigate(buildChatPath(selectedServiceIds), {
      replace: true,
      state: chatLocationState(true),
    });
  }

  function handleSignOut() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    profileLoadGenRef.current += 1;
    signOut(state.authUser?.email);
    setState({ ...DEFAULT_STATE, authReady: true, onboardingReady: true });
    navigate("/", { replace: true });
  }

  async function handleClearProfile() {
    if (!state.authUser || !state.authToken) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    profileLoadGenRef.current += 1;
    await clearProfile({ token: state.authToken, email: state.authUser.email });
    setState((s) => ({
      ...s,
      onboardingProfile: null,
      profile: null,
      selectedServiceIds: [],
      onboardingReady: true,
    }));
    navigate("/onboarding", { replace: true });
  }

  function resolveChatServiceIds(): string[] {
    if (state.selectedServiceIds.length > 0) {
      return state.selectedServiceIds;
    }
    if (state.onboardingProfile) {
      return servicesForRole(state.onboardingProfile.role, state.services).map(
        (service) => service.service_id
      );
    }
    return [];
  }

  function handleStartNewAssessment() {
    const ids = resolveChatServiceIds();
    if (ids.length > 0) {
      navigate(buildChatPath(ids), {
        replace: true,
        state: chatLocationState(true),
      });
      return;
    }
    if (state.onboardingProfile) {
      navigate("/select-services");
      return;
    }
    navigate("/onboarding", { replace: true });
  }

  function startChatWithServices(selectedServiceIds: string[]) {
    if (!state.authUser) return;
    saveSelectedServiceIds(state.authUser.email, selectedServiceIds);
    setState((s) => ({ ...s, selectedServiceIds }));
    navigate(buildChatPath(selectedServiceIds), {
      replace: true,
      state: chatLocationState(true),
    });
  }

  async function startNewDraft(profile: UserProfile, selectedServiceIds: string[]) {
    const authToken = authTokenRef.current;
    if (!authToken) return;

    const assessmentId = createAssessmentId({
      company: profile.company,
      role: profile.role,
      username: profile.username,
    });

    const draft: AssessmentDraft = {
      assessmentId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ownerEmail: state.authUser?.email,
      profile,
      selectedServiceIds,
      currentServiceId: selectedServiceIds[0],
      responsesByService: Object.fromEntries(
        selectedServiceIds.map((id) => [id, { responses: {} }])
      ),
    };

    const saved = await createAssessment(draft, authToken);
    await refreshAssessments(authToken);
    setState((s) => ({
      ...s,
      profile,
      activeAssessmentId: saved.assessmentId,
      activeDraft: saved,
    }));
    navigate(`/assessment/${encodeURIComponent(saved.assessmentId)}/questions`, {
      replace: true,
    });
  }

  async function resumeDraft(assessmentId: string) {
    const authToken = authTokenRef.current;
    if (!authToken) return;

    try {
      const draft = await getAssessment(assessmentId, authToken);
      if (isChatAssessmentDraft(draft)) {
        navigate(chatDraftResumePath(draft), { replace: true });
        return;
      }
      setState((s) => ({ ...s, activeAssessmentId: assessmentId, activeDraft: null }));
      navigate(`/assessment/${encodeURIComponent(assessmentId)}/questions`, {
        replace: true,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        assessmentsError: toFriendlyError(err),
      }));
    }
  }

  function viewSummary(assessmentId: string) {
    setState((s) => ({ ...s, activeAssessmentId: assessmentId, activeDraft: null }));
    navigate(`/assessment/${encodeURIComponent(assessmentId)}/summary`, {
      replace: true,
    });
  }

  async function discardDraft(assessmentId: string) {
    const authToken = authTokenRef.current;
    if (!authToken) return;
    await deleteAssessment(assessmentId, authToken);
    await refreshAssessments(authToken);
    if (state.activeAssessmentId === assessmentId) {
      setState((s) => ({
        ...s,
        profile: null,
        activeAssessmentId: null,
        activeDraft: null,
      }));
    }
  }

  function persistDraft(nextDraft: AssessmentDraft) {
    const authToken = authTokenRef.current;
    if (!authToken) return;

    setState((s) => ({ ...s, activeDraft: nextDraft, saveError: null }));

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      updateAssessment(nextDraft.assessmentId, nextDraft, authToken)
        .then((saved) => {
          setState((s) => ({ ...s, activeDraft: saved }));
          void refreshAssessments(authToken);
        })
        .catch((err) => {
          setState((s) => ({ ...s, saveError: toFriendlyError(err) }));
        });
    }, 400);
  }

  const isAuthenticated = Boolean(state.authToken);
  const sessionReady = state.authReady && (!state.authToken || Boolean(state.authUser));
  const hasOnboarding = Boolean(state.onboardingProfile);
  const needsOnboarding =
    isAuthenticated && state.onboardingReady && !hasOnboarding;
  const sessionLoading =
    !sessionReady || (isAuthenticated && !state.onboardingReady);

  return (
    <Routes>
      <Route
        path="/"
        element={
          sessionLoading ? (
            <AuthLoadingPage />
          ) : isAuthenticated && googleAuthConfigured ? (
            <Navigate to={postAuthPath(hasOnboarding)} replace />
          ) : (
            <SplashAuthPage onSignedIn={handleSignedIn} />
          )
        }
      />

      <Route
        path="/onboarding"
        element={
          sessionLoading ? (
            <AuthLoadingPage />
          ) : googleAuthConfigured && !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : needsOnboarding && state.authUser ? (
            <OnboardingPage
              authUser={state.authUser}
              roles={allRoles}
              services={state.services}
              servicesLoading={!state.authReady || state.loadingServices}
              servicesError={state.servicesError}
              onSignOut={handleSignOut}
              onComplete={(profile) => {
                void handleOnboardingComplete(
                  { company: profile.company, role: profile.role },
                  profile.selectedServiceIds
                );
              }}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          sessionLoading ? (
            <AuthLoadingPage />
          ) : googleAuthConfigured && !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : needsOnboarding ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <DashboardPage
              authUser={state.authUser}
              drafts={state.assessments}
              assessmentsLoading={state.assessmentsLoading}
              assessmentsError={state.assessmentsError}
              servicesLoading={!state.authReady || state.loadingServices}
              servicesError={state.servicesError}
              servicesCount={state.services.length}
              company={state.onboardingProfile?.company}
              role={state.onboardingProfile?.role}
              onStartNew={handleStartNewAssessment}
              onResume={resumeDraft}
              onViewSummary={viewSummary}
              onDiscard={(assessmentId) => {
                void discardDraft(assessmentId);
              }}
              onSignOut={handleSignOut}
              onClearProfile={() => {
                void handleClearProfile();
              }}
            />
          )
        }
      />

      <Route
        path="/profile"
        element={
          googleAuthConfigured && !isAuthenticated ? (
            <Navigate to="/" replace />
          ) : needsOnboarding ? (
            <Navigate to="/onboarding" replace />
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
          needsOnboarding ? (
            <Navigate to="/onboarding" replace />
          ) : state.profile ? (
            <ServicesPage
              profile={state.profile}
              services={state.services}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              onConfirm={(selectedServiceIds) => {
                void startNewDraft(state.profile!, selectedServiceIds);
              }}
            />
          ) : state.onboardingProfile && state.authUser ? (
            <ServicesPage
              profile={buildUserProfile(state.authUser, state.onboardingProfile)}
              services={state.services}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              initialSelectedServiceIds={state.selectedServiceIds}
              allowBackToDashboard
              confirmLabel="Confirm & start chat"
              onConfirm={startChatWithServices}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/assessment/:assessmentId/services"
        element={
          state.activeDraftLoading ? (
            <div className="af-page">
              <div className="af-page-inner context-help">Loading assessment…</div>
            </div>
          ) : state.activeDraft ? (
            <ServicesPage
              profile={state.activeDraft.profile}
              services={state.services}
              servicesLoading={state.loadingServices}
              servicesError={state.servicesError}
              initialSelectedServiceIds={state.activeDraft.selectedServiceIds}
              onConfirm={(selectedServiceIds) => {
                void startNewDraft(state.activeDraft!.profile, selectedServiceIds);
              }}
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
          state.activeDraftLoading ? (
            <div className="af-page">
              <div className="af-page-inner context-help">Loading assessment…</div>
            </div>
          ) : state.activeDraft ? (
            <>
              {state.saveError && (
                <div className="error-banner" role="alert">
                  <strong>Save error.</strong> {state.saveError}
                </div>
              )}
              <QuestionnairePage
                draft={state.activeDraft}
                services={state.services}
                authToken={state.authToken}
                onDraftChange={persistDraft}
                onFinish={() =>
                  navigate(
                    `/assessment/${encodeURIComponent(state.activeDraft!.assessmentId)}/summary`
                  )
                }
              />
            </>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/assessment/:assessmentId/summary"
        element={
          state.activeDraftLoading ? (
            <div className="af-page">
              <div className="af-page-inner context-help">Loading assessment…</div>
            </div>
          ) : state.activeDraft ? (
            <SummaryPage
              draft={state.activeDraft}
              services={state.services}
              onDiscard={() => {
                void discardDraft(state.activeDraft!.assessmentId);
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
