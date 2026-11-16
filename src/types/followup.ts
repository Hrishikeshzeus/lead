export type FollowUpTaskStatus = "due" | "overdue" | "completed" | "cancelled";

export type FollowUpChannel = "call" | "whatsapp" | "email" | "in_person" | "task";

export type FollowUpPriority = "low" | "medium" | "high" | "urgent";

export type AIDraftStatus = "pending_review" | "approved" | "rejected" | "sent" | "none";

export type SequenceAudience = "new_lead" | "qualified_lead" | "inactive_lead" | "custom";

export type SequenceActionType = "counsellor_reminder" | "ai_draft_review" | "task_assignment";

export type JobQueueStatus =
  | "scheduled"
  | "processing"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export type JobActionStatus = "scheduled" | "sent" | "failed" | "skipped" | "cancelled";

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  channel: FollowUpChannel;
  actionType: SequenceActionType;
  templateTitle: string;
  aiPromptInstruction: string;
}

export interface FollowUpSequenceRecord {
  id: string;
  tenantId: string;
  name: string;
  targetAudience: SequenceAudience;
  isActive: boolean;
  stopConditions: string[];
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTaskRecord {
  id: string;
  tenantId: string;
  leadId: string;
  sequenceId?: string | null;
  sequenceStep?: number;
  assignedCounsellorId?: string | null;
  assignedCounsellorName?: string | null;
  title: string;
  description: string;
  channel: FollowUpChannel;
  priority: FollowUpPriority;
  status: FollowUpTaskStatus;
  dueAt: string;
  timezone: string;
  suggestedAction: string;
  aiDraft: string;
  aiDraftStatus: AIDraftStatus;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  cancelledReason?: string | null;
  cancelledAt?: string | null;
  metadata: Record<string, any>;
  studentName?: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  courseInterest?: string;
  leadStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobQueueRecord {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  jobType:
    | "schedule_followup"
    | "generate_ai_draft"
    | "counsellor_reminder"
    | "check_inactivity_recovery"
    | "stop_sequence";
  taskId?: string | null;
  leadId?: string | null;
  payload: Record<string, any>;
  scheduledFor: string;
  timezone: string;
  status: JobQueueStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobLogRecord {
  id: string;
  tenantId: string;
  jobId?: string | null;
  taskId?: string | null;
  leadId?: string | null;
  action: string;
  status: JobActionStatus;
  details: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateFollowUpTaskInput {
  leadId: string;
  sequenceId?: string | null;
  sequenceStep?: number;
  assignedCounsellorId?: string | null;
  title: string;
  description?: string;
  channel?: FollowUpChannel;
  priority?: FollowUpPriority;
  dueAt: string;
  timezone?: string;
  suggestedAction?: string;
  generateDraft?: boolean;
}

export interface UpdateFollowUpTaskInput {
  title?: string;
  description?: string;
  channel?: FollowUpChannel;
  priority?: FollowUpPriority;
  status?: FollowUpTaskStatus;
  dueAt?: string;
  timezone?: string;
  suggestedAction?: string;
  aiDraft?: string;
  aiDraftStatus?: AIDraftStatus;
  assignedCounsellorId?: string | null;
  cancelledReason?: string;
}

export interface CreateSequenceInput {
  name: string;
  targetAudience: SequenceAudience;
  isActive?: boolean;
  stopConditions?: string[];
  steps: SequenceStep[];
}

export interface UpdateSequenceInput {
  name?: string;
  targetAudience?: SequenceAudience;
  isActive?: boolean;
  stopConditions?: string[];
  steps?: SequenceStep[];
}

export interface FollowUpTaskFilterParams {
  status?: string;
  channel?: string;
  priority?: string;
  assignedCounsellorId?: string;
  search?: string;
  leadId?: string;
}

export interface InactiveLeadRecoveryItem {
  leadId: string;
  studentName: string;
  email?: string | null;
  phone?: string | null;
  courseInterest: string;
  leadStatus: string;
  assignedCounsellorName?: string | null;
  daysInactive: number;
  lastActivityDate: string;
  lastActivityDescription: string;
  suggestedAction: string;
  recommendedSequenceId?: string | null;
  activeFollowupCount: number;
}

export interface ReviewAIDraftInput {
  taskId: string;
  status: "approved" | "rejected";
  editedDraft?: string;
}
