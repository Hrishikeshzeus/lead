"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth/session";
import { KnowledgeService } from "@/lib/knowledge/service";
import {
  KnowledgeDocumentRecord,
  KnowledgeChunkRecord,
  CreateFaqInput,
  DocumentUploadInput,
  KnowledgeFilterParams,
} from "@/types/knowledge";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getKnowledgeDocumentsAction(
  params: KnowledgeFilterParams = {}
): Promise<ActionResult<KnowledgeDocumentRecord[]>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const docs = await KnowledgeService.listDocuments(session, params);
    return { success: true, data: docs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch knowledge documents" };
  }
}

export async function getKnowledgeDocumentDetailsAction(
  documentId: string
): Promise<ActionResult<{ document: KnowledgeDocumentRecord; chunks: KnowledgeChunkRecord[] }>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const res = await KnowledgeService.getDocumentById(session, documentId);
    if (!res) {
      return { success: false, error: "Knowledge document not found or access denied." };
    }
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createFaqAction(
  input: CreateFaqInput
): Promise<ActionResult<KnowledgeDocumentRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const doc = await KnowledgeService.createFaq(session, input);
    revalidatePath("/knowledge-base");
    return { success: true, data: doc };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create FAQ" };
  }
}

export async function uploadKnowledgeDocumentAction(
  input: DocumentUploadInput
): Promise<ActionResult<KnowledgeDocumentRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const doc = await KnowledgeService.uploadDocument(session, input);
    revalidatePath("/knowledge-base");
    return { success: true, data: doc };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload document" };
  }
}

export async function approveKnowledgeDocumentAction(
  documentId: string
): Promise<ActionResult<KnowledgeDocumentRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const doc = await KnowledgeService.approveDocument(session, documentId);
    revalidatePath("/knowledge-base");
    return { success: true, data: doc };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve document" };
  }
}

export async function rejectKnowledgeDocumentAction(
  documentId: string
): Promise<ActionResult<KnowledgeDocumentRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const doc = await KnowledgeService.rejectDocument(session, documentId);
    revalidatePath("/knowledge-base");
    return { success: true, data: doc };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject document" };
  }
}
