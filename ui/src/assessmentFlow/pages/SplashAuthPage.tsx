import { useMemo, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { exchangeGoogleIdToken } from "../../auth/authApi";
import { isGoogleAuthConfigured } from "../../auth/googleClientId";
import type { AuthUser } from "../../auth/types";

type DraftIndexItem = {
  assessmentId: string;
  updatedAt: string;
  company: string;
  username: string;
  role: string;
};

type Props = {
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  onSignedIn: (token: string, user: AuthUser) => void;
  onSignOut: () => void;
  drafts: DraftIndexItem[];
  onResume: (assessmentId: string) => void;
  onDiscard: (assessmentId: string) => void;
  servicesLoading: boolean;
  servicesError: string | null;
  servicesCount: number;
  onStart: () => void;
};

export function SplashAuthPage({
  authUser,
  isAuthenticated,
  onSignedIn,
  onSignOut,
  drafts,
  onResume,
  onDiscard,
  servicesLoading,
  servicesError,
  servicesCount,
  onStart,
}: Props) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const googleAuthConfigured = isGoogleAuthConfigured();

  const statusText = useMemo(() => {
    if (!isAuthenticated && googleAuthConfigured) {
      return "Sign in with Google to load assessment services.";
    }
    if (servicesLoading) return "Loading assessment services…";
    if (servicesError) return "Couldn’t load assessment services.";
    if (servicesCount === 0) return "No assessment services found yet.";
    return `${servicesCount} assessment service${servicesCount === 1 ? "" : "s"} ready.`;
  }, [isAuthenticated, googleAuthConfigured, servicesLoading, servicesError, servicesCount]);

  const canStart = !servicesLoading && (!googleAuthConfigured || isAuthenticated);

  async function handleGoogleSuccess(response: CredentialResponse) {
    const credential = response.credential;
    if (!credential) {
      setSignInError("Google did not return a sign-in credential.");
      return;
    }

    setSigningIn(true);
    setSignInError(null);
    try {
      const result = await exchangeGoogleIdToken(credential);
      onSignedIn(result.access_token, result.user);
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  }

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
          <h2>Sign in</h2>
          {googleAuthConfigured ? (
            <>
              <p className="context-help">
                Use your Google account to access the assessment. Your session is stored
                locally in your browser.
              </p>

              {isAuthenticated && authUser ? (
                <div className="af-signed-in">
                  <div className="af-signed-in-name">{authUser.name}</div>
                  <div className="af-signed-in-email">{authUser.email}</div>
                  <button type="button" className="btn-ghost" onClick={onSignOut}>
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="af-google-login">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setSignInError("Google sign-in was cancelled or failed.")}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              )}

              {signInError && (
                <div className="error-banner" role="alert">
                  <strong>Sign-in error.</strong> {signInError}
                </div>
              )}
            </>
          ) : (
            <p className="context-help">
              Google sign-in is not configured for this build. You can continue without
              signing in while running locally.
            </p>
          )}

          <button
            type="button"
            className="btn-primary btn-large"
            onClick={onStart}
            disabled={!canStart || signingIn}
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
