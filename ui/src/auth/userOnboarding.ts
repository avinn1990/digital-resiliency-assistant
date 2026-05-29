export type UserOnboardingProfile = {
  company: string;
  role: string;
};

const STORAGE_KEY = "dra.userOnboarding";

function readAll(): Record<string, UserOnboardingProfile> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, UserOnboardingProfile>;
  } catch {
    return {};
  }
}

function writeAll(profiles: Record<string, UserOnboardingProfile>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getUserOnboarding(email: string): UserOnboardingProfile | null {
  const profile = readAll()[normalizeEmail(email)];
  if (!profile?.company?.trim() || !profile?.role?.trim()) return null;
  return profile;
}

export function hasUserOnboarding(email: string): boolean {
  return getUserOnboarding(email) !== null;
}

export function saveUserOnboarding(email: string, profile: UserOnboardingProfile) {
  const profiles = readAll();
  profiles[normalizeEmail(email)] = {
    company: profile.company.trim(),
    role: profile.role.trim(),
  };
  writeAll(profiles);
}
