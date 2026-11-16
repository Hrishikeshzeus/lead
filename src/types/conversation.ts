export type ConversationStatus = "active" | "counselor_handoff" | "completed" | "archived";

export type QualificationStage =
  | "greeting"
  | "inquiry"
  | "qualifying"
  | "contact_capture"
  | "handoff_ready"
  | "completed";

export type CounsellingPreference = "phone" | "whatsapp" | "in_person" | "video" | "none";

export type AssistantTone =
  | "welcoming_professional"
  | "academic_formal"
  | "encouraging_friendly";

export type SenderType = "student" | "assistant" | "counsellor" | "system";

export interface ConversationObjection {
  category: "fees" | "schedule" | "eligibility" | "location" | "scholarship" | "other";
  description: string;
  sentiment: "mild" | "strong" | "blocking";
}

export interface ConversationRecord {
  id: string;
  tenantId: string;
  leadId: string | null;
  sessionId: string;
  status: ConversationStatus;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  courseInterest: string | null;
  targetExam: string | null;
  preferredBatch: string | null;
  joiningTimeline: string | null;
  counsellingPreference: CounsellingPreference | null;
  objections: ConversationObjection[];
  summary: string;
  qualificationStage: QualificationStage;
  handoffReason: string | null;
  handoffRequestedAt: string | null;
  consentGiven: boolean;
  consentTimestamp: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  messagesCount?: number;
}

export interface ConversationMessageRecord {
  id: string;
  tenantId: string;
  conversationId: string;
  senderType: SenderType;
  content: string;
  extractedData?: Record<string, any>;
  citations?: Array<{
    title: string;
    sourceType: string;
    snippet: string;
    id?: string | null;
  }>;
  modelUsed?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
}

export interface AssistantConfigRecord {
  id: string;
  tenantId: string;
  assistantName: string;
  personaTitle: string;
  greetingMessage: string;
  customSystemPrompt: string;
  tone: AssistantTone;
  isEnabled: boolean;
  handoffThreshold: number;
  qualificationQuestions: string[];
  consentDisclaimer: string;
  rateLimitPerMinute: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAssistantConfigInput {
  assistantName?: string;
  personaTitle?: string;
  greetingMessage?: string;
  customSystemPrompt?: string;
  tone?: AssistantTone;
  isEnabled?: boolean;
  handoffThreshold?: number;
  qualificationQuestions?: string[];
  consentDisclaimer?: string;
  rateLimitPerMinute?: number;
}

export interface AIUsageLogRecord {
  id: string;
  tenantId: string;
  conversationId?: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: "success" | "error" | "fallback";
  errorMessage?: string | null;
  latencyMs: number;
  createdAt: string;
}

export interface StudentChatTurnInput {
  tenantId: string;
  sessionId: string;
  message: string;
  consentGiven?: boolean;
  clientIp?: string;
  isTestMode?: boolean;
}

export interface StudentChatTurnOutput {
  reply: string;
  conversationId: string;
  sessionId: string;
  qualificationStage: QualificationStage;
  citations: Array<{
    title: string;
    sourceType: "course" | "knowledge_chunk" | "faq";
    snippet: string;
    id?: string | null;
  }>;
  needsHumanHandoff: boolean;
  handoffReason?: string | null;
  leadCreatedOrUpdated: boolean;
  leadId?: string | null;
  objections: ConversationObjection[];
  summary: string;
  modelUsed: string;
  rateLimited?: boolean;
}

export interface ConversationFilterParams {
  status?: string;
  search?: string;
  hasLead?: boolean;
  hasObjections?: boolean;
  page?: number;
  pageSize?: number;
}
