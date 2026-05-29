import { deleteUserProfile } from "./profileApi";
import {
  clearAuthSession,
  clearSelectedServiceIds,
  loadAuthToken,
  loadAuthUser,
} from "./storage";

export type SignedInSession = {
  token: string;
  email: string;
};

export function getSignedInSession(): SignedInSession | null {
  const token = loadAuthToken();
  const user = loadAuthUser();
  if (!token || !user?.email) return null;
  return { token, email: user.email };
}

export function isSignedIn(): boolean {
  return getSignedInSession() !== null;
}

export function signOut(email?: string): void {
  const resolvedEmail = email ?? loadAuthUser()?.email;
  clearAuthSession();
  if (resolvedEmail) {
    clearSelectedServiceIds(resolvedEmail);
  }
}

export async function clearProfile(session?: SignedInSession): Promise<void> {
  const resolved = session ?? getSignedInSession();
  if (!resolved) return;

  try {
    await deleteUserProfile(resolved.token);
  } catch {
    // Still clear local preferences if the server profile is already gone.
  }
  clearSelectedServiceIds(resolved.email);
}
