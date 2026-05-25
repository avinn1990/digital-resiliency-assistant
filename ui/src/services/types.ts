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
};

export type SessionProgress = {
  current: number;
  total: number;
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
