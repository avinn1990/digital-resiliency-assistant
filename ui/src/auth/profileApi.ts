import { getApiBase } from "../lib/apiBase";

export type UserOnboardingProfile = {
  company: string;
  role: string;
};

async function request<T>(
  path: string,
  options?: RequestInit,
  authToken?: string
): Promise<T> {
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

export async function fetchUserProfile(
  authToken: string
): Promise<UserOnboardingProfile | null> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${authToken.trim()}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  const data = (await response.json()) as UserOnboardingProfile | null;
  if (!data?.company?.trim() || !data?.role?.trim()) {
    return null;
  }
  return data;
}

export function saveUserProfile(profile: UserOnboardingProfile, authToken: string) {
  return request<UserOnboardingProfile>(
    "/users/me/profile",
    {
      method: "PUT",
      body: JSON.stringify(profile),
    },
    authToken
  );
}
