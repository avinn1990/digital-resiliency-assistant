import { useMemo, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { exchangeGoogleIdToken } from "../../auth/authApi";
import { isGoogleAuthConfigured } from "../../auth/googleClientId";
import type { AuthUser } from "../../auth/types";

type Props = {
  onSignedIn: (token: string, user: AuthUser) => void;
};

export function SplashAuthPage({ onSignedIn }: Props) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const googleAuthConfigured = isGoogleAuthConfigured();

  const helpText = useMemo(() => {
    if (googleAuthConfigured) {
      return "Sign in with Google to start your AI-guided resiliency assessment.";
    }
    return "Google sign-in is not configured for this build. You can continue to the chat assessment without signing in while running locally.";
  }, [googleAuthConfigured]);

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
        </div>
      </div>

      <div className="af-splash-right">
        <div className="af-card">
          <h2>Sign in</h2>
          <p className="context-help">{helpText}</p>

          {googleAuthConfigured ? (
            <>
              <div className="af-google-login">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setSignInError("Google sign-in was cancelled or failed.")}
                  useOneTap={false}
                  use_fedcm_for_button
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>

              {signInError && (
                <div className="error-banner" role="alert">
                  <strong>Sign-in error.</strong> {signInError}
                </div>
              )}

              {signingIn && (
                <p className="context-help">Signing you in…</p>
              )}
            </>
          ) : (
            <a className="btn-primary btn-large" href="/chat">
              Continue to chat assessment
            </a>
          )}

        </div>
      </div>
    </div>
  );
}
