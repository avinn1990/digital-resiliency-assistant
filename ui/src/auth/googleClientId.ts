export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function isGoogleAuthConfigured(): boolean {
  return getGoogleClientId().length > 0;
}
