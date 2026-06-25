export type FrameworkSummary = {
  id: string;
  name: string;
  version: string;
  description?: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  attachments?: Array<{ fileId: string; fileName: string }>;
};

export type SessionProgress = {
  current: number;
  total: number;
};

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

export type SessionEngagementMeta = {
  capability_topic_progress?: TopicProgress | null;
  pillar_progress?: PillarProgress | null;
  engagement_context?: EngagementContext | null;
  paused?: boolean;
  resume_recap?: string | null;
};

export type AssessmentFocus = {
  capability_id: string;
  capability_name: string;
  evaluation_focus?: string;
};

export type AssessmentResult = {
  session_id: string;
  framework_id: string;
  overall_score: number;
  maturity_label: string;
  summary: string;
  control_results: Array<{
    control_id: string;
    score: number;
    status: string;
    evidence: string;
    recommendations: string[];
  }>;
};
