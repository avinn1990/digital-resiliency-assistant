import type { CanonicalRole, EvaluationServiceSummary } from "./types";

export type { CanonicalRole };

export function servicesForRole(
  roleId: string,
  services: EvaluationServiceSummary[]
): EvaluationServiceSummary[] {
  const normalized = roleId.trim();
  if (!normalized) return [];
  return services.filter((service) =>
    (service.target_audience_role_ids ?? []).includes(normalized)
  );
}

export function roleDisplayName(
  roleId: string,
  roles: CanonicalRole[]
): string {
  return roles.find((role) => role.role_id === roleId)?.display_name ?? roleId;
}

export function resolveRoleId(
  value: string,
  roles: CanonicalRole[]
): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const byId = roles.find((role) => role.role_id.toLowerCase() === normalized);
  if (byId) return byId.role_id;
  const byDisplay = roles.find(
    (role) => role.display_name.toLowerCase() === normalized
  );
  if (byDisplay) return byDisplay.role_id;
  return null;
}

export function serviceDescriptionForDisplay(description?: string): string {
  if (!description) return "";
  const marker = /target audience\s*:/i;
  const idx = description.search(marker);
  const summary = (idx >= 0 ? description.slice(0, idx) : description).trim();
  if (!summary) return "";
  return summary.endsWith(".") ? summary : `${summary}.`;
}
