import { useMemo, useState } from "react";

type DraftIndexItem = {
  assessmentId: string;
  updatedAt: string;
  company: string;
  username: string;
  role: string;
};

type Props = {
  authToken: string;
  onAuthTokenChange: (token: string) => void;
  drafts: DraftIndexItem[];
  onResume: (assessmentId: string) => void;
  onDiscard: (assessmentId: string) => void;
  servicesLoading: boolean;
  servicesError: string | null;
  servicesCount: number;
  onStart: () => void;
};

export function SplashAuthPage({
  authToken,
  onAuthTokenChange,
  drafts,
  onResume,
  onDiscard,
  servicesLoading,
  servicesError,
  servicesCount,
  onStart,
}: Props) {
  const [token, setToken] = useState(authToken);

  const statusText = useMemo(() => {
    if (servicesLoading) return "Loading assessment services…";
    if (servicesError) return "Couldn’t load assessment services.";
    if (servicesCount === 0) return "No assessment services found yet.";
    return `${servicesCount} assessment service${servicesCount === 1 ? "" : "s"} ready.`;
  }, [servicesLoading, servicesError, servicesCount]);

  return (
    <div className="af-splash">
      <div className="af-splash-left">
        <div className="af-brand">
          <div className="af-logo" aria-hidden="true" />
          <div>
            <div className="af-title">Digital Resiliency Assessment</div>
            <div className="af-subtitle">
              Role-based questions. Auto-save after each service. Resume anytime.
            </div>
          </div>
        </div>

        <div className="af-hero">
          <h1>Measure what matters, without the busywork.</h1>
          <p>
            This assessment is organized by services you’re responsible for. You’ll
            answer a focused set of questions, one service at a time.
          </p>
          <ul className="af-bullets">
            <li>Role → relevant services, pre-selected by default</li>
            <li>Auto-save after each service (and while you type)</li>
            <li>Clear summary at the end</li>
          </ul>
          <div className="af-status">{statusText}</div>
          {servicesError && (
            <div className="error-banner" role="alert">
              <strong>Service catalog error.</strong> {servicesError}
            </div>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="af-drafts">
            <h2>Continue where you left off</h2>
            <div className="af-draft-list">
              {drafts.slice(0, 5).map((d) => (
                <div key={d.assessmentId} className="af-draft">
                  <div className="af-draft-main">
                    <div className="af-draft-title">
                      {d.company} · {d.role}
                    </div>
                    <div className="af-draft-meta">
                      {d.username} · last saved{" "}
                      {new Date(d.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="af-draft-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onResume(d.assessmentId)}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => onDiscard(d.assessmentId)}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="af-splash-right">
        <div className="af-card">
          <h2>Authenticate</h2>
          <p className="context-help">
            If your deployment requires an access token, paste it here. It’s stored
            locally in your browser and sent as a Bearer token on API calls.
          </p>

          <label className="field-label" htmlFor="auth-token">
            Access token (optional)
          </label>
          <input
            id="auth-token"
            className="af-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            autoComplete="off"
          />

          <button
            type="button"
            className="btn-primary btn-large"
            onClick={() => {
              onAuthTokenChange(token);
              onStart();
            }}
            disabled={servicesLoading}
          >
            Start assessment
          </button>

          <div className="af-card-footer">
            <a className="af-link" href="/chat">
              Or use the chat-based assessment
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

