import type { AuthUser } from "./types";

const AUTH_TOKEN_KEY = "dra.authToken";
const AUTH_USER_KEY = "dra.authUser";
const SELECTED_SERVICES_PREFIX = "dra.selectedServices.";

export function loadAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export function saveAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function loadAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function selectedServicesKey(email: string): string {
  return `${SELECTED_SERVICES_PREFIX}${email.trim().toLowerCase()}`;
}

export function loadSelectedServiceIds(email: string): string[] {
  const key = selectedServicesKey(email);
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export function saveSelectedServiceIds(email: string, serviceIds: string[]) {
  const key = selectedServicesKey(email);
  const normalized = Array.from(
    new Set(serviceIds.map((s) => s.trim()).filter(Boolean))
  );
  localStorage.setItem(key, JSON.stringify(normalized));
}

export function clearSelectedServiceIds(email: string) {
  localStorage.removeItem(selectedServicesKey(email));
}
