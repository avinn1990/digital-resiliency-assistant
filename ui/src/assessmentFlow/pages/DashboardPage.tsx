import type { AuthUser } from "../../auth/types";
import type { UserDraftSummary } from "../assessmentsApi";

type Props = {
  authUser: AuthUser | null;
  drafts: UserDraftSummary[];
  assessmentsLoading: boolean;
  assessmentsError: string | null;
  servicesLoading: boolean;
  servicesError: string | null;
  servicesCount: number;
  company?: string;
  role?: string;
  onStartNew: () => void;
  onResume: (assessmentId: string) => void;
  onViewSummary: (assessmentId: string) => void;
  onDiscard: (assessmentId: string) => void;
  onSignOut: () => void;
  onClearProfile: () => void;
};

function DraftCard({
  draft,
  onOpen,
  onDiscard,
  openLabel,
}: {
  draft: UserDraftSummary;
  onOpen: () => void;
  onDiscard: () => void;
  openLabel: string;
}) {
  return (
    <div className="af-dashboard-card">
      <div className="af-dashboard-card-main">
        <div className="af-dashboard-card-title">
          {draft.company} · {draft.role}
        </div>
        <div className="af-dashboard-card-meta">
          {draft.username} · last saved {new Date(draft.updatedAt).toLocaleString()}
        </div>
        <div className="af-dashboard-card-progress">
          <span className={`af-pill ${draft.status === "completed" ? "ok" : ""}`}>
            {draft.status === "completed" ? "Completed" : "In progress"}
          </span>
          <span className="af-pill">
            {draft.servicesDone}/{draft.servicesTotal} services
          </span>
        </div>
      </div>
      <div className="af-dashboard-card-actions">
        <button type="button" className="btn-secondary" onClick={onOpen}>
          {openLabel}
        </button>
        <button type="button" className="btn-ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}

export function DashboardPage({
  authUser,
  drafts,
  assessmentsLoading,
  assessmentsError,
  servicesLoading,
  servicesError,
  servicesCount,
  company,
  role,
  onStartNew,
  onResume,
  onViewSummary,
  onDiscard,
  onSignOut,
  onClearProfile,
}: Props) {
  const pending = drafts.filter((d) => d.status === "pending");
  const completed = drafts.filter((d) => d.status === "completed");
  const hasExisting = drafts.length > 0;

  return (
    <div className="af-page">
      <div className="af-page-inner af-dashboard">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Your workspace</div>
            <h1 className="af-h1">
              {authUser ? `Welcome back, ${authUser.name.split(" ")[0]}` : "Your assessments"}
            </h1>
            {authUser && <p className="context-help">{authUser.email}</p>}
            {company && role && (
              <p className="context-help">
                {company} · {role}
              </p>
            )}
          </div>
          <div className="af-dashboard-top-actions">
            {authUser && (
              <>
                <button type="button" className="btn-ghost" onClick={onClearProfile}>
                  Change role
                </button>
                <button type="button" className="btn-ghost" onClick={onSignOut}>
                  Sign out
                </button>
              </>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={onStartNew}
              disabled={servicesLoading}
            >
              Start new assessment
            </button>
          </div>
        </div>

        {servicesError && (
          <div className="error-banner" role="alert">
            <strong>Service catalog error.</strong> {servicesError}
          </div>
        )}

        {assessmentsError && (
          <div className="error-banner" role="alert">
            <strong>Could not load your assessments.</strong> {assessmentsError}
          </div>
        )}

        <div className="af-dashboard-status">
          {assessmentsLoading
            ? "Loading your assessments…"
            : servicesLoading
              ? "Loading assessment services…"
              : hasExisting
                ? `${pending.length} in progress · ${completed.length} completed`
                : `${servicesCount} assessment service${servicesCount === 1 ? "" : "s"} available for your role.`}
        </div>

        {assessmentsLoading ? (
          <div className="af-card af-card-page af-dashboard-empty">
            <p className="context-help">Loading your assessments…</p>
          </div>
        ) : !hasExisting ? (
          <div className="af-card af-card-page af-dashboard-empty">
            <h2 className="af-h2">No assessments yet</h2>
            <p className="context-help">
              Start a new AI-guided assessment when you are ready. Your progress will
              appear here so you can continue later.
            </p>
            <button
              type="button"
              className="btn-primary btn-large"
              onClick={onStartNew}
              disabled={servicesLoading}
            >
              Start your first assessment
            </button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="af-dashboard-section">
                <h2 className="af-h2">Continue an assessment</h2>
                <p className="context-help">
                  Pick up where you left off, or start a new assessment using the button
                  above.
                </p>
                <div className="af-dashboard-list">
                  {pending.map((draft) => (
                    <DraftCard
                      key={draft.assessmentId}
                      draft={draft}
                      openLabel="Continue"
                      onOpen={() => onResume(draft.assessmentId)}
                      onDiscard={() => onDiscard(draft.assessmentId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="af-dashboard-section">
                <h2 className="af-h2">Completed</h2>
                <div className="af-dashboard-list">
                  {completed.map((draft) => (
                    <DraftCard
                      key={draft.assessmentId}
                      draft={draft}
                      openLabel="View summary"
                      onOpen={() => onViewSummary(draft.assessmentId)}
                      onDiscard={() => onDiscard(draft.assessmentId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {pending.length === 0 && (
              <div className="af-card af-card-page">
                <h2 className="af-h2">Start another assessment</h2>
                <p className="context-help">
                  You do not have any assessments in progress. Start a new AI chat
                  assessment when you are ready.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onStartNew}
                  disabled={servicesLoading}
                >
                  Start new assessment
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
