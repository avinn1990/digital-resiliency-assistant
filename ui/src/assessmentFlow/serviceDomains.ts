const DOMAIN_ORDER = [
  "Governance & Compliance",
  "Identity & Access",
  "Engineering & Platform",
  "Infrastructure & Operations",
  "Data & Content",
  "People & Culture",
  "Risk & Resilience",
] as const;

export function groupServicesByDomain<T extends { service_id: string; domain_group?: string }>(
  services: T[]
): Array<{ domain: string; services: T[] }> {
  const buckets = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const service of services) {
    const domain = service.domain_group?.trim();
    if (!domain) {
      ungrouped.push(service);
      continue;
    }
    const list = buckets.get(domain) ?? [];
    list.push(service);
    buckets.set(domain, list);
  }

  const grouped: Array<{ domain: string; services: T[] }> = [];
  for (const domain of DOMAIN_ORDER) {
    const list = buckets.get(domain);
    if (list?.length) {
      grouped.push({ domain, services: list });
      buckets.delete(domain);
    }
  }

  for (const [domain, list] of buckets.entries()) {
    if (list.length) grouped.push({ domain, services: list });
  }

  if (ungrouped.length) {
    grouped.push({ domain: "Other services", services: ungrouped });
  }

  return grouped;
}
