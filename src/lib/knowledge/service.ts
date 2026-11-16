import type { AuthSession, AppRole } from "../auth/types";
import type {
  KnowledgeDocumentRecord,
  KnowledgeChunkRecord,
  CreateFaqInput,
  UpdateFaqInput,
  DocumentUploadInput,
  KnowledgeFilterParams,
  DocumentType,
  DocumentStatus,
} from "../../types/knowledge";
import { SafeDocumentParser } from "./parser.ts";
import { isSupabaseConfigured } from "../supabase/client.ts";
import { createClient } from "../supabase/server.ts";

class InMemoryKnowledgeStore {
  private docs: Map<string, KnowledgeDocumentRecord[]> = new Map();
  private chunks: Map<string, KnowledgeChunkRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";

    const apexDocs: KnowledgeDocumentRecord[] = [
      {
        id: "d1111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        title: "Scholarship & Financial Aid Policy 2026",
        documentType: "faq",
        category: "Financial Aid",
        filePath: null,
        fileName: null,
        fileSize: 310,
        mimeType: "text/plain",
        status: "approved",
        rawContent:
          "Apex Institute offers Dean Merit Scholarships covering up to 30% of annual tuition for incoming B.Tech students who achieved 90% or above in high school STEM subjects or top 500 in national entrance exams. Applications must be submitted by July 15. Financial aid is not applicable to certificate or executive evening courses.",
        approvedBy: "10000000-0000-0000-0000-000000000001",
        approvedByName: "Dr. Alan Turing",
        approvedAt: "2026-01-10T10:00:00Z",
        createdBy: "10000000-0000-0000-0000-000000000001",
        createdAt: "2026-01-10T09:00:00Z",
        updatedAt: "2026-01-10T10:00:00Z",
        chunksCount: 1,
      },
      {
        id: "d1111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        title: "Hostel Accommodation & Campus Residence Rules",
        documentType: "faq",
        category: "Campus Life",
        filePath: null,
        fileName: null,
        fileSize: 240,
        mimeType: "text/plain",
        status: "approved",
        rawContent:
          "On-campus residence is guaranteed for all first-year undergraduate students who apply before June 30. Single room fee is $4,800 per year, and twin-sharing is $3,200 per year, which includes high-speed Wi-Fi and 24/7 dining access.",
        approvedBy: "10000000-0000-0000-0000-000000000001",
        approvedByName: "Dr. Alan Turing",
        approvedAt: "2026-01-12T10:00:00Z",
        createdBy: "10000000-0000-0000-0000-000000000001",
        createdAt: "2026-01-12T09:00:00Z",
        updatedAt: "2026-01-12T10:00:00Z",
        chunksCount: 1,
      },
    ];

    const apexChunks: KnowledgeChunkRecord[] = [
      {
        id: "e1111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        documentId: "d1111111-0000-0000-0000-000000000001",
        chunkIndex: 0,
        title: "Apex Dean Merit Scholarship Terms",
        content:
          "Apex Institute offers Dean Merit Scholarships covering up to 30% of annual tuition for incoming B.Tech students who achieved 90% or above in high school STEM subjects or top 500 in national entrance exams. Applications must be submitted by July 15. Financial aid is not applicable to certificate or executive evening courses.",
        tokenCount: 65,
        isApproved: true,
        createdAt: "2026-01-10T10:00:00Z",
        documentTitle: "Scholarship & Financial Aid Policy 2026",
        documentType: "faq",
      },
      {
        id: "e1111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        documentId: "d1111111-0000-0000-0000-000000000002",
        chunkIndex: 0,
        title: "Apex Campus Hostel Accommodation Fees",
        content:
          "On-campus residence is guaranteed for all first-year undergraduate students who apply before June 30. Single room fee is $4,800 per year, and twin-sharing is $3,200 per year, which includes high-speed Wi-Fi and 24/7 dining access.",
        tokenCount: 48,
        isApproved: true,
        createdAt: "2026-01-12T10:00:00Z",
        documentTitle: "Hostel Accommodation & Campus Residence Rules",
        documentType: "faq",
      },
    ];

    const beaconDocs: KnowledgeDocumentRecord[] = [
      {
        id: "d2222222-0000-0000-0000-000000000001",
        tenantId: beaconId,
        title: "International Student Visa & English Proficiency Guidelines",
        documentType: "faq",
        category: "Admissions",
        filePath: null,
        fileName: null,
        fileSize: 310,
        mimeType: "text/plain",
        status: "approved",
        rawContent:
          "Beacon Global University requires all international applicants from non-English speaking jurisdictions to submit an official IELTS score of at least 6.5 (no band below 6.0) or TOEFL iBT score of at least 90. Student visa documentation support letters (I-20 equivalent) are issued within 10 business days after the initial deposit is confirmed.",
        approvedBy: "20000000-0000-0000-0000-000000000001",
        approvedByName: "Dr. Grace Hopper",
        approvedAt: "2026-01-10T10:00:00Z",
        createdBy: "20000000-0000-0000-0000-000000000001",
        createdAt: "2026-01-10T09:00:00Z",
        updatedAt: "2026-01-10T10:00:00Z",
        chunksCount: 1,
      },
    ];

    const beaconChunks: KnowledgeChunkRecord[] = [
      {
        id: "e2222222-0000-0000-0000-000000000001",
        tenantId: beaconId,
        documentId: "d2222222-0000-0000-0000-000000000001",
        chunkIndex: 0,
        title: "Beacon English Proficiency & Visa Requirements",
        content:
          "Beacon Global University requires all international applicants from non-English speaking jurisdictions to submit an official IELTS score of at least 6.5 (no band below 6.0) or TOEFL iBT score of at least 90. Student visa documentation support letters (I-20 equivalent) are issued within 10 business days after the initial deposit is confirmed.",
        tokenCount: 60,
        isApproved: true,
        createdAt: "2026-01-10T10:00:00Z",
        documentTitle: "International Student Visa & English Proficiency Guidelines",
        documentType: "faq",
      },
    ];

    this.docs.set(apexId, apexDocs);
    this.chunks.set(apexId, apexChunks);

    this.docs.set(beaconId, beaconDocs);
    this.chunks.set(beaconId, beaconChunks);
  }

  public getDocs(tenantId: string): KnowledgeDocumentRecord[] {
    return this.docs.get(tenantId) || [];
  }

  public addDoc(tenantId: string, doc: KnowledgeDocumentRecord): void {
    const list = this.getDocs(tenantId);
    this.docs.set(tenantId, [doc, ...list]);
  }

  public updateDoc(
    tenantId: string,
    docId: string,
    updates: Partial<KnowledgeDocumentRecord>
  ): KnowledgeDocumentRecord | null {
    const list = this.getDocs(tenantId);
    const idx = list.findIndex((d) => d.id === docId);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    this.docs.set(tenantId, list);
    return updated;
  }

  public getChunks(tenantId: string): KnowledgeChunkRecord[] {
    return this.chunks.get(tenantId) || [];
  }

  public addChunks(tenantId: string, newChunks: KnowledgeChunkRecord[]): void {
    const list = this.getChunks(tenantId);
    this.chunks.set(tenantId, [...newChunks, ...list]);
  }

  public setChunksApproval(tenantId: string, documentId: string, isApproved: boolean): void {
    const list = this.getChunks(tenantId);
    for (const c of list) {
      if (c.documentId === documentId) {
        c.isApproved = isApproved;
      }
    }
    this.chunks.set(tenantId, list);
  }
}

const devKnowledgeStore = new InMemoryKnowledgeStore();

export class KnowledgeService {
  private static getVerifiedTenantId(session: AuthSession): string {
    const tenantId =
      session.currentTenant?.id ||
      session.memberships?.[0]?.tenantId ||
      (session.user as any)?.tenantId;
    if (!session.isAuthenticated || !tenantId) {
      throw new Error("Authentication required: No verified tenant membership found in session.");
    }
    return tenantId;
  }

  private static assertInstituteAdmin(session: AuthSession): void {
    if (!session.isAuthenticated || !session.user) {
      throw new Error("Authentication required.");
    }
    if (session.user.isSuperAdmin) return;
    const role: AppRole | undefined =
      session.currentRole ||
      session.memberships?.[0]?.role ||
      (session.user as any)?.role;
    if (role !== "institute_admin") {
      throw new Error("Access denied: Only Institute Administrators can approve documents or modify knowledge settings.");
    }
  }

  /**
   * List knowledge documents for the current tenant.
   */
  public static async listDocuments(
    session: AuthSession,
    params: KnowledgeFilterParams = {}
  ): Promise<KnowledgeDocumentRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        let query = supabase
          .from("knowledge_documents")
          .select("*, chunks:knowledge_chunks(count)")
          .eq("tenant_id", tenantId);

        if (params.documentType && params.documentType !== "all") {
          query = query.eq("document_type", params.documentType);
        }

        if (params.category && params.category !== "all") {
          query = query.eq("category", params.category);
        }

        if (params.status && params.status !== "all") {
          query = query.eq("status", params.status);
        }

        if (params.search) {
          query = query.or(`title.ilike.%${params.search}%,raw_content.ilike.%${params.search}%`);
        }

        const sortBy = params.sortBy === "title" ? "title" : params.sortBy === "status" ? "status" : "created_at";
        const ascending = params.sortOrder === "asc";
        query = query.order(sortBy, { ascending });

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            tenantId: d.tenant_id,
            title: d.title,
            documentType: d.document_type as DocumentType,
            category: d.category,
            filePath: d.file_path,
            fileName: d.file_name,
            fileSize: d.file_size,
            mimeType: d.mime_type,
            status: d.status as DocumentStatus,
            rawContent: d.raw_content,
            approvedBy: d.approved_by,
            approvedAt: d.approved_at,
            createdBy: d.created_by,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            chunksCount: d.chunks?.[0]?.count || 0,
          }));
        }
      } catch (err) {
        console.warn("[KnowledgeService.listDocuments] Supabase fallback to local:", err);
      }
    }

    // Local / In-memory store fallback
    let list = [...devKnowledgeStore.getDocs(tenantId)];
    const chunks = devKnowledgeStore.getChunks(tenantId);

    // Populate chunks count
    list = list.map((doc) => ({
      ...doc,
      chunksCount: chunks.filter((c) => c.documentId === doc.id).length,
    }));

    if (params.documentType && params.documentType !== "all") {
      list = list.filter((d) => d.documentType === params.documentType);
    }
    if (params.category && params.category !== "all") {
      list = list.filter((d) => d.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params.status && params.status !== "all") {
      list = list.filter((d) => d.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.rawContent.toLowerCase().includes(q));
    }

    const sortOrder = params.sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (params.sortBy === "title") return a.title.localeCompare(b.title) * sortOrder;
      if (params.sortBy === "status") return a.status.localeCompare(b.status) * sortOrder;
      return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (sortOrder === 1 ? -1 : 1);
    });

    return list;
  }

  /**
   * Get single document and its associated chunks.
   */
  public static async getDocumentById(
    session: AuthSession,
    documentId: string
  ): Promise<{ document: KnowledgeDocumentRecord; chunks: KnowledgeChunkRecord[] } | null> {
    const tenantId = this.getVerifiedTenantId(session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: docData, error: docError } = await supabase
          .from("knowledge_documents")
          .select("*")
          .eq("id", documentId)
          .eq("tenant_id", tenantId)
          .single();

        if (docError && docError.code !== "PGRST116") throw docError;

        if (docData) {
          const { data: chunkData } = await supabase
            .from("knowledge_chunks")
            .select("*")
            .eq("document_id", documentId)
            .eq("tenant_id", tenantId)
            .order("chunk_index", { ascending: true });

          const document: KnowledgeDocumentRecord = {
            id: docData.id,
            tenantId: docData.tenant_id,
            title: docData.title,
            documentType: docData.document_type,
            category: docData.category,
            filePath: docData.file_path,
            fileName: docData.file_name,
            fileSize: docData.file_size,
            mimeType: docData.mime_type,
            status: docData.status,
            rawContent: docData.raw_content,
            approvedBy: docData.approved_by,
            approvedAt: docData.approved_at,
            createdBy: docData.created_by,
            createdAt: docData.created_at,
            updatedAt: docData.updated_at,
            chunksCount: chunkData?.length || 0,
          };

          const chunks: KnowledgeChunkRecord[] = (chunkData || []).map((c: any) => ({
            id: c.id,
            tenantId: c.tenant_id,
            documentId: c.document_id,
            chunkIndex: c.chunk_index,
            title: c.title,
            content: c.content,
            tokenCount: c.token_count,
            isApproved: Boolean(c.is_approved),
            createdAt: c.created_at,
            documentTitle: docData.title,
            documentType: docData.document_type,
          }));

          return { document, chunks };
        }
      } catch (err) {
        console.warn("[KnowledgeService.getDocumentById] Supabase fallback to local:", err);
      }
    }

    const doc = devKnowledgeStore.getDocs(tenantId).find((d) => d.id === documentId);
    if (!doc) return null;

    const chunks = devKnowledgeStore
      .getChunks(tenantId)
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    return { document: doc, chunks };
  }

  /**
   * Create an FAQ entry.
   */
  public static async createFaq(
    session: AuthSession,
    input: CreateFaqInput
  ): Promise<KnowledgeDocumentRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.question || input.question.trim().length === 0) {
      throw new Error("FAQ question/title is required.");
    }
    if (!input.answer || input.answer.trim().length === 0) {
      throw new Error("FAQ answer text is required.");
    }

    const userRole: AppRole | undefined =
      session.currentRole ||
      session.memberships?.[0]?.role ||
      (session.user as any)?.role;
    const isAdmin = userRole === "institute_admin" || Boolean(session.user?.isSuperAdmin);
    const shouldApprove = Boolean(input.autoApprove && isAdmin);

    const now = new Date().toISOString();
    const docId = crypto.randomUUID();
    const newDoc: KnowledgeDocumentRecord = {
      id: docId,
      tenantId,
      title: input.question.trim(),
      documentType: "faq",
      category: input.category?.trim() || "General Admissions",
      filePath: null,
      fileName: null,
      fileSize: Buffer.byteLength(input.answer, "utf-8"),
      mimeType: "text/plain",
      status: shouldApprove ? "approved" : "draft",
      rawContent: input.answer.trim(),
      approvedBy: shouldApprove ? session.user?.id || null : null,
      approvedByName: shouldApprove ? session.user?.fullName : null,
      approvedAt: shouldApprove ? now : null,
      createdBy: session.user?.id || null,
      createdAt: now,
      updatedAt: now,
      chunksCount: 1,
    };

    // Generate chunk
    const chunkId = crypto.randomUUID();
    const newChunk: KnowledgeChunkRecord = {
      id: chunkId,
      tenantId,
      documentId: docId,
      chunkIndex: 0,
      title: newDoc.title,
      content: newDoc.rawContent,
      tokenCount: Math.ceil(newDoc.rawContent.length / 4),
      isApproved: shouldApprove,
      createdAt: now,
      documentTitle: newDoc.title,
      documentType: "faq",
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("knowledge_documents").insert({
          id: newDoc.id,
          tenant_id: newDoc.tenantId,
          title: newDoc.title,
          document_type: newDoc.documentType,
          category: newDoc.category,
          file_size: newDoc.fileSize,
          mime_type: newDoc.mimeType,
          status: newDoc.status,
          raw_content: newDoc.rawContent,
          approved_by: newDoc.approvedBy,
          approved_at: newDoc.approvedAt,
          created_by: newDoc.createdBy,
        });

        await supabase.from("knowledge_chunks").insert({
          id: newChunk.id,
          tenant_id: newChunk.tenantId,
          document_id: newChunk.documentId,
          chunk_index: newChunk.chunkIndex,
          title: newChunk.title,
          content: newChunk.content,
          token_count: newChunk.tokenCount,
          is_approved: newChunk.isApproved,
        });
      } catch (err) {
        console.warn("[KnowledgeService.createFaq] Supabase insert failed, saving locally:", err);
      }
    }

    devKnowledgeStore.addDoc(tenantId, newDoc);
    devKnowledgeStore.addChunks(tenantId, [newChunk]);

    return newDoc;
  }

  /**
   * Upload supported document (PDF, DOCX, TXT, MD) with size check and safe text extraction.
   */
  public static async uploadDocument(
    session: AuthSession,
    input: DocumentUploadInput
  ): Promise<KnowledgeDocumentRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    // 1. Validation: file size and type
    const validation = SafeDocumentParser.validateFile(input.fileName, input.fileSize, input.mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Extract Text Safely
    let rawContent = input.rawContent || "";
    if (!rawContent && input.fileContentBase64) {
      const buffer = Buffer.from(input.fileContentBase64, "base64");
      const extracted = await SafeDocumentParser.extractText(buffer, input.fileName);
      rawContent = extracted.text;
    }

    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error("Could not extract readable text from document. Ensure file is not encrypted or blank.");
    }

    const ext = input.fileName.toLowerCase().split(".").pop() || "txt";
    const docType: DocumentType =
      ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "md" || ext === "markdown" ? "markdown" : "txt";

    const docId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 3. Create document record (in 'draft' or 'pending_approval' status, awaiting admin verification)
    const newDoc: KnowledgeDocumentRecord = {
      id: docId,
      tenantId,
      title: input.title.trim() || input.fileName,
      documentType: docType,
      category: input.category?.trim() || "Institutional Policies",
      filePath: `tenants/${tenantId}/vault/${docId}-${input.fileName}`,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      status: "pending_approval", // Requires admin preview & approval before AI exposure
      rawContent: rawContent.trim(),
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      createdBy: session.user?.id || null,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Generate Knowledge Chunks
    const rawChunks = SafeDocumentParser.chunkText(rawContent, newDoc.title, {
      maxChunkLength: 600,
      overlap: 80,
    });

    const newChunks: KnowledgeChunkRecord[] = rawChunks.map((c) => ({
      id: crypto.randomUUID(),
      tenantId,
      documentId: docId,
      chunkIndex: c.chunkIndex,
      title: c.title,
      content: c.content,
      tokenCount: c.tokenCount,
      isApproved: false, // Unapproved until admin reviews
      createdAt: now,
      documentTitle: newDoc.title,
      documentType: docType,
    }));

    newDoc.chunksCount = newChunks.length;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("knowledge_documents").insert({
          id: newDoc.id,
          tenant_id: newDoc.tenantId,
          title: newDoc.title,
          document_type: newDoc.documentType,
          category: newDoc.category,
          file_path: newDoc.filePath,
          file_name: newDoc.fileName,
          file_size: newDoc.fileSize,
          mime_type: newDoc.mimeType,
          status: newDoc.status,
          raw_content: newDoc.rawContent,
          created_by: newDoc.createdBy,
        });

        if (newChunks.length > 0) {
          await supabase.from("knowledge_chunks").insert(
            newChunks.map((c) => ({
              id: c.id,
              tenant_id: c.tenantId,
              document_id: c.documentId,
              chunk_index: c.chunkIndex,
              title: c.title,
              content: c.content,
              token_count: c.tokenCount,
              is_approved: false,
            }))
          );
        }
      } catch (err) {
        console.warn("[KnowledgeService.uploadDocument] Supabase fallback to local:", err);
      }
    }

    devKnowledgeStore.addDoc(tenantId, newDoc);
    devKnowledgeStore.addChunks(tenantId, newChunks);

    return newDoc;
  }

  /**
   * Admin preview & approval: authorize document and its chunks for AI use.
   */
  public static async approveDocument(
    session: AuthSession,
    documentId: string
  ): Promise<KnowledgeDocumentRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const now = new Date().toISOString();
    const updates: Partial<KnowledgeDocumentRecord> = {
      status: "approved",
      approvedBy: session.user?.id || null,
      approvedByName: session.user?.fullName,
      approvedAt: now,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase
          .from("knowledge_documents")
          .update({
            status: "approved",
            approved_by: session.user?.id || null,
            approved_at: now,
            updated_at: now,
          })
          .eq("id", documentId)
          .eq("tenant_id", tenantId);

        // Authorize all associated chunks
        await supabase
          .from("knowledge_chunks")
          .update({ is_approved: true })
          .eq("document_id", documentId)
          .eq("tenant_id", tenantId);
      } catch (err) {
        console.warn("[KnowledgeService.approveDocument] Supabase fallback:", err);
      }
    }

    const updated = devKnowledgeStore.updateDoc(tenantId, documentId, updates);
    devKnowledgeStore.setChunksApproval(tenantId, documentId, true);

    if (!updated) throw new Error("Document not found.");
    return updated;
  }

  /**
   * Reject / revoke approval for a document and disable its chunks for AI.
   */
  public static async rejectDocument(
    session: AuthSession,
    documentId: string
  ): Promise<KnowledgeDocumentRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const now = new Date().toISOString();
    const updates: Partial<KnowledgeDocumentRecord> = {
      status: "draft",
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase
          .from("knowledge_documents")
          .update({
            status: "draft",
            approved_by: null,
            approved_at: null,
            updated_at: now,
          })
          .eq("id", documentId)
          .eq("tenant_id", tenantId);

        await supabase
          .from("knowledge_chunks")
          .update({ is_approved: false })
          .eq("document_id", documentId)
          .eq("tenant_id", tenantId);
      } catch (err) {
        console.warn("[KnowledgeService.rejectDocument] Supabase fallback:", err);
      }
    }

    const updated = devKnowledgeStore.updateDoc(tenantId, documentId, updates);
    devKnowledgeStore.setChunksApproval(tenantId, documentId, false);

    if (!updated) throw new Error("Document not found.");
    return updated;
  }

  /**
   * Search approved knowledge chunks within tenant (PostgreSQL Full-Text Search or fallback).
   */
  public static async searchApprovedChunks(
    session: AuthSession,
    searchQuery: string,
    limit: number = 5
  ): Promise<KnowledgeChunkRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        // Use textSearch on tsvector column 'tsv'
        const { data, error } = await supabase
          .from("knowledge_chunks")
          .select("*, document:knowledge_documents(title, document_type)")
          .eq("tenant_id", tenantId)
          .eq("is_approved", true)
          .textSearch("tsv", cleanQuery, { type: "plain", config: "english" })
          .limit(limit);

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((c: any) => ({
            id: c.id,
            tenantId: c.tenant_id,
            documentId: c.document_id,
            chunkIndex: c.chunk_index,
            title: c.title,
            content: c.content,
            tokenCount: c.token_count,
            isApproved: true,
            createdAt: c.created_at,
            documentTitle: c.document?.title,
            documentType: c.document?.document_type,
          }));
        }
      } catch (err) {
        console.warn("[KnowledgeService.searchApprovedChunks] Supabase FTS fallback to local:", err);
      }
    }

    // Local in-memory full-text search fallback
    const tenantChunks = devKnowledgeStore
      .getChunks(tenantId)
      .filter((c) => c.isApproved);

    const STOP_WORDS = new Set([
      "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
      "any", "are", "as", "at", "be", "because", "been", "before", "being",
      "below", "between", "both", "but", "by", "can", "could", "did", "do", "does",
      "doing", "down", "during", "each", "few", "for", "from", "further", "had",
      "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how",
      "i", "if", "in", "into", "is", "it", "its", "me", "more", "most", "my",
      "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
      "our", "ours", "out", "over", "own", "same", "she", "should", "so", "some",
      "such", "than", "that", "the", "their", "theirs", "them", "then", "there",
      "these", "they", "this", "those", "through", "to", "too", "under", "until",
      "up", "very", "was", "we", "were", "what", "when", "where", "which", "while",
      "who", "whom", "why", "with", "you", "your", "yours"
    ]);

    const queryTerms = cleanQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

    const scored = tenantChunks.map((chunk) => {
      let score = 0;
      const lowerTitle = chunk.title.toLowerCase();
      const lowerContent = chunk.content.toLowerCase();

      for (const term of queryTerms) {
        if (lowerTitle.includes(term)) score += 3;
        if (lowerContent.includes(term)) score += 1;
      }

      return { chunk, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.chunk);
  }
}
