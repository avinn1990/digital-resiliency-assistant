export function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
  if (!raw) {
    if (import.meta.env.PROD) {
      console.error(
        "VITE_API_URL was not set at build time. Set it to your dra-backend public URL (e.g. https://dra-backend-xxxx.onrender.com) and redeploy dra-ui."
      );
    }
    return "/api";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes("localhost") || raw.startsWith("127.")) {
    return `http://${raw}`;
  }
  return `https://${raw}`;
}

export const API_BASE = resolveApiBase();
