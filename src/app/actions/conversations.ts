"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { ConversationService } from "@/lib/conversations/service";
import { AIConversationEngine } from "@/lib/ai/conversation-engine";
import {
  StudentChatTurnInput,
  StudentChatTurnOutput,
  AssistantConfigRecord,
  UpdateAssistantConfigInput,
  ConversationRecord,
  ConversationMessageRecord,
  ConversationFilterParams,
  AIUsageLogRecord,
} from "@/types/conversation";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Public/visitor or preview action to send a chat message to the AI Assistant.
 */
export async function sendChatMessageAction(
  input: StudentChatTurnInput
): Promise<ActionResult<StudentChatTurnOutput>> {
  try {
    if (!input.tenantId || !input.sessionId || !input.message) {
      return { success: false, error: "Tenant ID, Session ID, and Message are required." };
    }

    const result = await AIConversationEngine.processStudentTurn(input);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process chat inquiry." };
  }
}

/**
 * Get the assistant configuration for the active tenant.
 */
export async function getAssistantConfigAction(
  tenantId?: string
): Promise<ActionResult<AssistantConfigRecord>> {
  try {
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const session = await getServerAuthSession();
      resolvedTenantId = session.currentTenant?.id || session.memberships?.[0]?.tenantId || (session.user as any)?.tenantId;
    }

    if (!resolvedTenantId) {
      return { success: false, error: "No active tenant specified or found in session." };
    }

    const config = await ConversationService.getAssistantConfig(resolvedTenantId);
    return { success: true, data: config };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retrieve assistant configuration." };
  }
}

/**
 * Update the assistant configuration (Institute Admin only).
 */
export async function updateAssistantConfigAction(
  updates: UpdateAssistantConfigInput
): Promise<ActionResult<AssistantConfigRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }

    const updated = await ConversationService.updateAssistantConfig(session, updates);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update assistant configuration." };
  }
}

/**
 * List conversations for the active tenant (Staff view).
 */
export async function getConversationsAction(
  params: ConversationFilterParams = {}
): Promise<ActionResult<ConversationRecord[]>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }

    const list = await ConversationService.listConversations(session, params);
    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch conversations." };
  }
}

/**
 * Get messages and transcript for a conversation.
 */
export async function getConversationTranscriptAction(
  conversationId: string
): Promise<ActionResult<{ conversation: ConversationRecord; messages: ConversationMessageRecord[] }>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }

    const tenantId = session.currentTenant?.id || session.memberships?.[0]?.tenantId || (session.user as any)?.tenantId;
    if (!tenantId) {
      return { success: false, error: "Valid tenant session required." };
    }

    const convList = await ConversationService.listConversations(session);
    const conversation = convList.find((c) => c.id === conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    const messages = await ConversationService.getMessages(tenantId, conversationId);
    return { success: true, data: { conversation, messages } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch conversation transcript." };
  }
}

/**
 * Get recent AI usage and error logs for auditing.
 */
export async function getAIUsageLogsAction(
  limit: number = 50
): Promise<ActionResult<AIUsageLogRecord[]>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }

    const logs = await ConversationService.getAIUsageLogs(session, limit);
    return { success: true, data: logs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch AI usage logs." };
  }
}
