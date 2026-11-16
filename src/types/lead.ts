export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "counselling_booked"
  | "admitted"
  | "lost";

export type LeadSource =
  | "website"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "referral"
  | "phone"
  | "manual";

export interface LeadRecord {
  id: string;
  tenantId: string;
  studentName: string;
  phone: string | null;
  email: string | null;
  courseInterest: string;
  targetExam: string | null;
  preferredBatch: string | null;
  source: LeadSource;
  budgetRange: string | null;
  joiningTimeline: string | null;
  notes: string | null;
  consentStatus: boolean;
  assignedCounsellorId: string | null;
  assignedCounsellorName?: string | null;
  status: LeadStatus;
  score: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadActionType =
  | "lead_created"
  | "status_changed"
  | "counsellor_assigned"
  | "lead_updated"
  | "lead_archived"
  | "lead_unarchived"
  | "note_added"
  | "imported_from_csv";

export interface LeadActivity {
  id: string;
  tenantId: string;
  leadId: string;
  userId: string | null;
  actorName: string;
  actionType: LeadActionType;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateLeadInput {
  studentName: string;
  email?: string | null;
  phone?: string | null;
  courseInterest: string;
  targetExam?: string | null;
  preferredBatch?: string | null;
  source?: LeadSource;
  budgetRange?: string | null;
  joiningTimeline?: string | null;
  notes?: string | null;
  consentStatus?: boolean;
  assignedCounsellorId?: string | null;
  status?: LeadStatus;
}

export interface UpdateLeadInput {
  studentName?: string;
  email?: string | null;
  phone?: string | null;
  courseInterest?: string;
  targetExam?: string | null;
  preferredBatch?: string | null;
  source?: LeadSource;
  budgetRange?: string | null;
  joiningTimeline?: string | null;
  notes?: string | null;
  consentStatus?: boolean;
  assignedCounsellorId?: string | null;
  status?: LeadStatus;
}

export interface LeadFilterParams {
  search?: string;
  status?: LeadStatus | "all";
  source?: LeadSource | "all";
  counsellorId?: string | "all";
  isArchived?: boolean;
  sortBy?: "createdAt" | "studentName" | "status" | "score";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface LeadPaginationResult {
  leads: LeadRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadImportRow {
  studentName: string;
  email?: string;
  phone?: string;
  courseInterest: string;
  targetExam?: string;
  preferredBatch?: string;
  source?: LeadSource;
  budgetRange?: string;
  joiningTimeline?: string;
  notes?: string;
  consentStatus?: boolean;
  status?: LeadStatus;
}

export interface LeadImportPreviewRow extends LeadImportRow {
  rowNumber: number;
  isValid: boolean;
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

export interface LeadImportResult {
  totalProcessed: number;
  imported: number;
  skippedDuplicates: number;
  errorsCount: number;
  errorRows: Array<{ rowNumber: number; reason: string }>;
}
