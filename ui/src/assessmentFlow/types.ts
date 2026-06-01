export type EvaluationServiceSummary = {
  service_id: string;
  service_name?: string;
  version?: string;
  description?: string;
  target_audience: string[];
};

export type EvaluationQuestion = {
  id: string;
  prompt: string;
  intent?: string;
  field_key?: string;
  evaluation_focus?: string;
  capability_id?: string;
  capability_name?: string;
};

export type EvaluationCapabilityQuestionGroup = {
  capability_id: string;
  capability_name: string;
  questions: EvaluationQuestion[];
};

export type EvaluationServiceBundle = {
  service_id: string;
  service_name?: string;
  version?: string;
  description?: string;
  target_audience: string[];
  capabilities: Array<{
    id: string;
    name: string;
    description?: string;
    pillar?: string;
  }>;
  reference_questions_by_capability: EvaluationCapabilityQuestionGroup[];
  reference_questions: EvaluationQuestion[];
};

export type UserProfile = {
  username: string;
  fullName: string;
  company: string;
  role: string;
};

export type AssessmentMode = "questionnaire" | "chat";

export type ChatServiceSnapshot = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  progress: { current: number; total: number };
  completed: boolean;
  capabilityStates?: Record<string, unknown>;
  facts?: Record<string, unknown>;
};

export type ChatAssessmentState = {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  progress: { current: number; total: number };
  completed: boolean;
  activeServiceId: string;
  remainingServiceIds: string[];
  completedServiceIds: string[];
  serviceSnapshots: Record<string, ChatServiceSnapshot>;
};

export type AssessmentDraft = {
  assessmentId: string;
  createdAt: string;
  updatedAt: string;
  authToken?: string;
  ownerEmail?: string;
  mode?: AssessmentMode;
  profile: UserProfile;
  selectedServiceIds: string[];
  currentServiceId?: string;
  responsesByService: Record<
    string,
    {
      answeredAt?: string;
      responses: Record<string, string>;
    }
  >;
  chatState?: ChatAssessmentState;
};

