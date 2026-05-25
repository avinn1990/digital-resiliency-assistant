/** Plain-language copy and error text (people-first, low cognitive load). */

export function toFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "We couldn't reach the server. Check your internet connection, then try again.";
  }
  if (/502|503|bad gateway|service unavailable/i.test(raw)) {
    return "The assessment service is busy right now. Wait a few seconds and try again.";
  }
  if (/404|not found/i.test(raw)) {
    return "That resource wasn't found. Start a new chat or pick a different framework.";
  }
  if (/cannot reach the backend|VITE_API_URL/i.test(raw)) {
    return "The agent isn't reachable. Make sure the API is running and the app is pointed at the right URL.";
  }
  if (raw.length > 160) {
    return "Something went wrong. Please try again, or start a new chat.";
  }
  return raw;
}

export const STEPS = [
  { id: 1, label: "Choose framework", short: "Start" },
  { id: 2, label: "Answer questions", short: "Chat" },
  { id: 3, label: "View results", short: "Results" },
] as const;

export type AppStep = 1 | 2 | 3;

export function getCurrentStep(
  sessionId: string | null,
  hasAssessment: boolean
): AppStep {
  if (!sessionId) return 1;
  if (hasAssessment) return 3;
  return 2;
}
