import { useMemo, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { exchangeGoogleIdToken } from "../../auth/authApi";
import { isGoogleAuthConfigured } from "../../auth/googleClientId";
import type { AuthUser } from "../../auth/types";

type Props = {
  onSignedIn: (token: string, user: AuthUser) => void;
};

export function LandingAuthCard({ onSignedIn }: Props) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const googleAuthConfigured = isGoogleAuthConfigured();

  const helpText = useMemo(() => {
    if (googleAuthConfigured) {
      return "Sign in with Google to start your AI-guided resiliency assessment.";
    }
    return "Google sign-in is not configured for this build. Continue to the chat assessment while running locally.";
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
    <div className="landing-auth-card">
      <h2>Welcome</h2>
      <p className="context-help">{helpText}</p>

      {googleAuthConfigured ? (
        <>
          <div className="landing-google-login">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setSignInError("Google sign-in was cancelled or failed.")}
              useOneTap={false}
              use_fedcm_for_button
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="pill"
            />
          </div>

          {signInError && (
            <div className="error-banner" role="alert">
              <strong>Sign-in error.</strong> {signInError}
            </div>
          )}

          {signingIn && <p className="context-help">Signing you in…</p>}
        </>
      ) : (
        <a className="landing-btn landing-btn--primary" href="/chat">
          Continue to Chat Assessment
        </a>
      )}

      <a className="landing-btn landing-btn--outline" href="/chat">
        Explore Without Signing In
      </a>
    </div>
  );
}
