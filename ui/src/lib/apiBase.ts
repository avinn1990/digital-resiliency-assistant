type RuntimeConfig = { apiBaseUrl?: string };

let cachedBase: string | null = null;
let resolvePromise: Promise<string> | null = null;

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes("localhost") || trimmed.startsWith("127.")) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

/** Hostnames without a dot are usually Render private-network refs — not reachable from a browser. */
export function isBrowserReachableApiBase(base: string): boolean {
  if (!base || base === "/api") return false;
  try {
    const url = new URL(base.startsWith("http") ? base : `https://${base}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

function resolveFromViteEnv(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return "";
  return normalizeApiBase(raw);
}

async function loadRuntimeConfig(): Promise<string> {
  try {
    const response = await fetch("/runtime-config.json", { cache: "no-store" });
    if (!response.ok) return "";
    const data = (await response.json()) as RuntimeConfig;
    return normalizeApiBase(data.apiBaseUrl ?? "");
  } catch {
    return "";
  }
}

/**
 * Resolves the backend base URL for browser calls.
 * Prefers a public URL from build-time env or runtime-config.json (written at build on Render).
 */
export async function getApiBase(): Promise<string> {
  if (cachedBase) return cachedBase;
  if (resolvePromise) return resolvePromise;

  resolvePromise = (async () => {
    const fromVite = resolveFromViteEnv();
    if (fromVite && isBrowserReachableApiBase(fromVite)) {
      cachedBase = fromVite;
      return cachedBase;
    }

    // Only use runtime-config when VITE_API_URL was not set at build time.
    if (!fromVite) {
      const fromRuntime = await loadRuntimeConfig();
      if (fromRuntime && isBrowserReachableApiBase(fromRuntime)) {
        cachedBase = fromRuntime;
        return cachedBase;
      }
    }

    if (fromVite) {
      cachedBase = fromVite;
      return cachedBase;
    }

    if (import.meta.env.PROD) {
      console.error(
        "API base URL is missing or not reachable from the browser. Check render.yaml (dra-ui VITE_API_URL from dra-backend) and redeploy via the Render blueprint."
      );
    }
    cachedBase = "/api";
    return cachedBase;
  })();

  return resolvePromise;
}

/** @deprecated Use getApiBase() — may point at /api or a private host in production. */
export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL ?? "") || "/api";
