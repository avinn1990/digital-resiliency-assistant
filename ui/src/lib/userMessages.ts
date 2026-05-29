/** Plain-language copy and error text (people-first, low cognitive load). */

function detailFromApiError(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((d) => JSON.stringify(d)).join("; ");
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export function toFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const apiDetail = detailFromApiError(raw);
  if (apiDetail) {
    if (/OPENAI_API_KEY|must be set/i.test(apiDetail)) {
      return "OpenAI is not configured on the assessment service. Sync the Render blueprint and set OPENAI_API_KEY on the dra-openai environment group.";
    }
    if (apiDetail.length < 220) return apiDetail;
  }

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "We couldn't reach the server. The API may still be starting, or production wiring in render.yaml may need a sync and redeploy.";
  }
  if (/502|503|bad gateway|service unavailable/i.test(raw)) {
    return "The assessment services are still starting on Render (this can take up to a minute on the free tier). Wait a moment, then try again.";
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
