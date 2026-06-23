/** Known acronyms kept uppercase when title-casing labels. */
const ACRONYMS = new Set([
  "API",
  "CAB",
  "CISO",
  "ERM",
  "GRC",
  "IAM",
  "IT",
  "KPI",
  "KRI",
  "PKI",
  "PMO",
  "TPRM",
]);

function titleCaseToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;
  const upper = trimmed.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Convert slug ids (security-architecture-lead) to readable labels. */
export function formatSlugLabel(slug: string): string {
  return slug
    .split(/[-_/]+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

/**
 * Title-case human-readable labels for UI display.
 * Preserves punctuation separators like /, &, and parentheses content.
 */
export function formatDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  if (/^[\w-]+$/.test(trimmed) && trimmed.includes("-")) {
    return formatSlugLabel(trimmed);
  }

  return trimmed
    .split(/(\s+|\/|&)/)
    .map((part) => {
      if (/^[\s/&]+$/.test(part)) return part;
      if (/^[\w-]+$/.test(part) && part.includes("-")) {
        return formatSlugLabel(part);
      }
      return part
        .split(/(\(|\)|,)/)
        .map((sub) => {
          if (/^[(),]$/.test(sub)) return sub;
          return sub
            .split(/\s+/)
            .filter(Boolean)
            .map(titleCaseToken)
            .join(" ");
        })
        .join("");
    })
    .join("");
}
