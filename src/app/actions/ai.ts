"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { AdmissionsRAGService } from "@/lib/ai/rag";
import { AIRAGQueryInput, AIRAGResponse } from "@/types/knowledge";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute server-side RAG inquiry using the verified tenant's approved knowledge.
 * Provider API keys are strictly kept server-side and never sent to browser code.
 */
export async function queryAdmissionsAIAction(
  input: AIRAGQueryInput
): Promise<ActionResult<AIRAGResponse>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const response = await AdmissionsRAGService.answerInquiry(session, input);
    return { success: true, data: response };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process inquiry" };
  }
}
