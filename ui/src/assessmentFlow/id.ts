function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashToBase36(input: string): string {
  // Simple deterministic hash (non-crypto) to keep IDs stable across reloads.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export function createAssessmentId(params: {
  company: string;
  role: string;
  username: string;
}): string {
  const company = slugify(params.company);
  const role = slugify(params.role);
  const username = slugify(params.username);
  const seed = `${company}|${role}|${username}`;
  const suffix = hashToBase36(seed).slice(-6).padStart(6, "0");
  return `${company}-${role}-${username}-${suffix}`;
}

