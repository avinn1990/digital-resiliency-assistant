import type { EvaluationServiceSummary } from "./types";

export function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

export function collectRoles(services: EvaluationServiceSummary[]): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const svc of services) {
    for (const role of svc.target_audience ?? []) {
      const trimmed = String(role ?? "").trim();
      if (!trimmed) continue;
      if (seen.has(trimmed.toLowerCase())) continue;
      seen.add(trimmed.toLowerCase());
      roles.push(trimmed);
    }
  }
  return roles.sort((a, b) => a.localeCompare(b));
}

export function servicesForRole(
  role: string,
  services: EvaluationServiceSummary[]
): EvaluationServiceSummary[] {
  const normalized = normalizeRole(role);
  if (!normalized) return [];
  return services.filter((service) =>
    (service.target_audience ?? []).some(
      (audience) => normalizeRole(String(audience)) === normalized
    )
  );
}
