export function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
  if (!raw) return "/api";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes("localhost") || raw.startsWith("127.")) {
    return `http://${raw}`;
  }
  return `https://${raw}`;
}

export const API_BASE = resolveApiBase();
