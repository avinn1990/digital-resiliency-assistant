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
}: Props) {
  const pending = drafts.filter((d) => d.status === "pending");
  const completed = drafts.filter((d) => d.status === "completed");

  return (
    <div className="af-page">
      <div className="af-page-inner af-dashboard">
        <div className="af-topbar">
          <div>
            <div className="af-kicker">Your workspace</div>
            <h1 className="af-h1">
              {authUser ? `Welcome, ${authUser.name.split(" ")[0]}` : "Your assessments"}
            </h1>
            {authUser && (
              <p className="context-help">{authUser.email}</p>
            )}
            {company && role && (
              <p className="context-help">
                {company} · {role}
              </p>
            )}
          </div>
          <div className="af-dashboard-top-actions">
            {authUser && (
              <button type="button" className="btn-ghost" onClick={onSignOut}>
                Sign out
              </button>
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
            <strong>Assessment load error.</strong> {assessmentsError}
          </div>
        )}

        <div className="af-dashboard-status">
          {assessmentsLoading
            ? "Loading your assessments…"
            : servicesLoading
              ? "Loading assessment services…"
              : `${servicesCount} assessment service${servicesCount === 1 ? "" : "s"} available.`}
        </div>

        {assessmentsLoading ? (
          <div className="af-card af-card-page af-dashboard-empty">
            <p className="context-help">Loading your assessments…</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="af-card af-card-page af-dashboard-empty">
            <h2 className="af-h2">No assessments yet</h2>
            <p className="context-help">
              Start an AI-guided chat assessment. The assistant asks questions
              conversationally and tracks your progress as you go.
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
                <h2 className="af-h2">In progress (saved form drafts)</h2>
                <p className="context-help">
                  These were started in the form-based flow. Resume opens the saved
                  questionnaire, or start fresh in the{" "}
                  <a className="af-link" href="/chat">
                    AI chat assessment
                  </a>
                  .
                </p>
                <div className="af-dashboard-list">
                  {pending.map((draft) => (
                    <DraftCard
                      key={draft.assessmentId}
                      draft={draft}
                      openLabel="Resume"
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
          </>
        )}

        <div className="af-dashboard-footer">
          <a className="af-link" href="/chat">
            Start or continue in the AI chat assessment
          </a>
        </div>
      </div>
    </div>
  );
}
