export type DocumentType = "faq" | "pdf" | "docx" | "txt" | "markdown";
export type DocumentStatus = "draft" | "pending_approval" | "approved" | "archived";

export interface KnowledgeDocumentRecord {
  id: string;
  tenantId: string;
  title: string;
  documentType: DocumentType;
  category: string;
  filePath: string | null;
  fileName: string | null;
  fileSize: number;
  mimeType: string | null;
  status: DocumentStatus;
  rawContent: string;
  approvedBy: string | null;
  approvedByName?: string | null;
  approvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  chunksCount?: number;
}

export interface KnowledgeChunkRecord {
  id: string;
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  content: string;
  tokenCount: number;
  isApproved: boolean;
  createdAt: string;
  documentTitle?: string;
  documentType?: DocumentType;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category?: string;
  autoApprove?: boolean;
}

export interface UpdateFaqInput {
  question?: string;
  answer?: string;
  category?: string;
  status?: DocumentStatus;
}

export interface DocumentUploadInput {
  title: string;
  category?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileContentBase64?: string;
  rawContent?: string;
}

export interface KnowledgeFilterParams {
  search?: string;
  documentType?: DocumentType | "all";
  category?: string;
  status?: DocumentStatus | "all";
  sortBy?: "title" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface RAGCitation {
  id: string;
  title: string;
  documentId?: string;
  sourceType: "course" | "knowledge_chunk";
  snippet: string;
}

export interface AIRAGQueryInput {
  query: string;
  studentContext?: {
    studentName?: string;
    courseInterest?: string;
    phone?: string;
  };
}

export interface AIRAGResponse {
  answer: string;
  citations: RAGCitation[];
  needsHumanHandoff: boolean;
  handoffReason?: string;
  confidenceScore: number;
  modelUsed: string;
  tenantName?: string;
}
