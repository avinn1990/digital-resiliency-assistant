/** Engagement helpers for chat assessment pacing and milestones. */

export const MINUTES_PER_CAPABILITY = 2.5;

export type TopicProgress = {
  covered: number;
  total: number;
};

export type PillarProgress = {
  pillar: string;
  resolved_in_pillar: number;
  total_in_pillar: number;
  pillar_complete?: boolean;
};

export type EngagementContext = {
  turn_number?: number;
  capabilities_resolved?: number;
  capabilities_remaining?: number;
  pct_complete?: number;
  should_offer_checkpoint?: boolean;
  possible_fatigue?: boolean;
  paused?: boolean;
};

export function formatTimeEstimate(remainingCapabilities: number): string {
  if (remainingCapabilities <= 0) return "Wrapping up";
  const minutes = Math.max(1, Math.round(remainingCapabilities * MINUTES_PER_CAPABILITY));
  if (minutes === 1) return "About 1 minute left for this service";
  return `About ${minutes} minutes left for this service`;
}

export function formatServiceQueueLabel(
  serviceIndex: number,
  serviceTotal: number,
  serviceName: string
): string {
  if (serviceTotal <= 1) return serviceName;
  return `Service ${serviceIndex} of ${serviceTotal} — ${serviceName}`;
}

export function formatCapabilityProgress(current: number, total: number): string {
  if (total <= 0) return "Getting started";
  return `Capability ${Math.min(current + 1, total)} of ${total}`;
}

export function formatTopicProgress(topic: TopicProgress | null | undefined): string | null {
  if (!topic || topic.total <= 0) return null;
  return `${topic.covered} of ${topic.total} topics covered in this area`;
}

export function formatPillarProgress(pillar: PillarProgress | null | undefined): string | null {
  if (!pillar) return null;
  if (pillar.pillar_complete) {
    return `Section complete: ${pillar.pillar}`;
  }
  return `Section: ${pillar.pillar} (${pillar.resolved_in_pillar} of ${pillar.total_in_pillar} areas)`;
}

const MILESTONE_THRESHOLDS = [25, 50, 75] as const;

export function highestMilestoneReached(pct: number): number {
  let reached = 0;
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (pct >= threshold) reached = threshold;
  }
  return reached;
}
export function detectMilestone(
  pct: number,
  lastMilestone: number
): number | null {
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (pct >= threshold && lastMilestone < threshold) {
      return threshold;
    }
  }
  return null;
}

export function milestoneMessage(threshold: number, serviceName: string): string {
  const name = serviceName || "this service";
  if (threshold >= 75) {
    return `You're in the home stretch for ${name} — full maturity results are almost ready.`;
  }
  if (threshold >= 50) {
    return `Halfway through ${name} — your results will include a maturity view for each area.`;
  }
  return `Nice momentum on ${name} — steady progress builds a clearer resiliency picture.`;
}

export function countPendingArtifacts(
  capabilityStates: Record<string, unknown> | undefined
): number {
  if (!capabilityStates) return 0;
  let count = 0;
  for (const state of Object.values(capabilityStates)) {
    if (!state || typeof state !== "object") continue;
    const artifacts = (state as { pending_artifacts?: unknown[] }).pending_artifacts;
    if (!Array.isArray(artifacts)) continue;
    count += artifacts.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as { status?: string }).status !== "fulfilled"
    ).length;
  }
  return count;
}

export function progressPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}
