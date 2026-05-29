import { getApiBase } from "../lib/apiBase";
import type { AuthUser, GoogleAuthResponse } from "./types";

async function authRequest<T>(path: string, options?: RequestInit, authToken?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (authToken?.trim()) {
    headers.Authorization = `Bearer ${authToken.trim()}`;
  }

  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function exchangeGoogleIdToken(idToken: string) {
  return authRequest<GoogleAuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function fetchCurrentUser(authToken: string) {
  return authRequest<AuthUser>("/auth/me", undefined, authToken);
}
