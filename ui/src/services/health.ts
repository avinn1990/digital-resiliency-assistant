import { getApiBase } from "../lib/apiBase";

export type BackendHealthStatus = "checking" | "ready" | "warming" | "offline";

export type BackendHealth = {
  status: BackendHealthStatus;
  checks?: Record<string, boolean>;
};

/**
 * Gateway `/health` must succeed for the UI to work (auth, catalog, etc.).
 * `/health/ready` probes downstream microservices; on Render free tier they may
 * still be waking while the gateway is already reachable.
 */
export async function fetchBackendHealth(): Promise<BackendHealth> {
  try {
    const apiBase = await getApiBase();
    const healthResponse = await fetch(`${apiBase}/health`, { method: "GET" });
    if (!healthResponse.ok) {
      return { status: "offline" };
    }

    try {
      const readyResponse = await fetch(`${apiBase}/health/ready`, {
        method: "GET",
      });
      if (!readyResponse.ok) {
        return { status: "warming" };
      }
      const data = (await readyResponse.json()) as {
        status?: string;
        checks?: Record<string, boolean>;
      };
      if (data.status === "ok") {
        return { status: "ready", checks: data.checks };
      }
      return { status: "warming", checks: data.checks };
    } catch {
      return { status: "warming" };
    }
  } catch {
    return { status: "offline" };
  }
}

/** True when the API gateway responds (login, onboarding, chat may still retry deps). */
export async function checkBackendHealth(): Promise<boolean> {
  const health = await fetchBackendHealth();
  return health.status !== "offline";
}

export function canReachBackend(status: BackendHealthStatus): boolean {
  return status === "ready" || status === "warming";
}
