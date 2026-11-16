import type { AuthSession, AppRole } from "../auth/types.ts";
import type {
  ConversationRecord,
  ConversationMessageRecord,
  AssistantConfigRecord,
  UpdateAssistantConfigInput,
  AIUsageLogRecord,
  ConversationFilterParams,
  ConversationStatus,
  QualificationStage,
  CounsellingPreference,
  AssistantTone,
} from "../../types/conversation.ts";
import { isSupabaseConfigured } from "../supabase/client.ts";
import { createClient } from "../supabase/server.ts";

class InMemoryConversationStore {
  private configs: Map<string, AssistantConfigRecord> = new Map();
  private conversations: Map<string, ConversationRecord[]> = new Map();
  private messages: Map<string, ConversationMessageRecord[]> = new Map();
  private usageLogs: Map<string, AIUsageLogRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";
    const now = new Date().toISOString();

    // 1. Apex Assistant Config
    this.configs.set(apexId, {
      id: "cf111111-0000-0000-0000-000000000001",
      tenantId: apexId,
      assistantName: "Apex Admissions Advisor",
      personaTitle: "Lead Academic Admissions Counselor",
      greetingMessage:
        "Welcome to Apex Institute of Technology! I can answer questions about our B.Tech and M.Tech engineering programs, curriculum, admissions criteria, and batch schedules. How can I assist you today?",
      customSystemPrompt:
        "Apex Institute emphasizes rigorous engineering fundamentals, state-of-the-art AI labs, and high-placement partnerships with top tech leaders.",
      tone: "welcoming_professional",
      isEnabled: true,
      handoffThreshold: 0.65,
      qualificationQuestions: [
        "What engineering discipline or entrance exam are you preparing for?",
        "When are you planning to begin your studies?",
        "Do you prefer weekday morning or weekend batch schedules?",
      ],
      consentDisclaimer:
        "By sharing your contact details, you consent to receive official admissions updates and counseling assistance from Apex Institute of Technology.",
      rateLimitPerMinute: 15,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Beacon Assistant Config
    this.configs.set(beaconId, {
      id: "cf222222-0000-0000-0000-000000000002",
      tenantId: beaconId,
      assistantName: "Beacon Admissions Guide",
      personaTitle: "Global Academic Counselor",
      greetingMessage:
        "Welcome to Beacon Global University! I am here to help you explore our international master's degrees, visa documentation rules, and campus facilities. What program are you interested in?",
      customSystemPrompt:
        "Beacon Global University emphasizes global mobility, diversity, and international accreditation. Ensure international applicants are informed about visa timelines.",
      tone: "academic_formal",
      isEnabled: true,
      handoffThreshold: 0.65,
      qualificationQuestions: [
        "Which postgraduate program are you exploring?",
        "What is your target intake semester (Fall or Spring)?",
        "Do you require on-campus international student housing?",
      ],
      consentDisclaimer:
        "By sharing your details, you agree to receive admissions guidance and compliance updates from Beacon Global University Admissions Office.",
      rateLimitPerMinute: 15,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Sample Apex Conversation
    const apexConvId = "cv111111-0000-0000-0000-000000000001";
    this.conversations.set(apexId, [
      {
        id: apexConvId,
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        sessionId: "sess-apex-sample-01",
        status: "active",
        studentName: "Alex Rivera",
        studentEmail: "alex.rivera@example.com",
        studentPhone: "+1-555-1101",
        courseInterest: "B.Tech Computer Science & AI",
        targetExam: "SAT (1450)",
        preferredBatch: "Morning Batch (08:30 - 14:30)",
        joiningTimeline: "Immediate (Fall 2026)",
        counsellingPreference: "phone",
        objections: [],
        summary:
          "Student Alex Rivera inquired about B.Tech AI eligibility and batch schedules. Qualified for SAT track and consented to counselor outreach.",
        qualificationStage: "contact_capture",
        handoffReason: null,
        handoffRequestedAt: null,
        consentGiven: true,
        consentTimestamp: now,
        metadata: { source: "website_widget" },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: now,
      },
    ]);

    this.messages.set(apexConvId, [
      {
        id: "msg-1",
        tenantId: apexId,
        conversationId: apexConvId,
        senderType: "assistant",
        content:
          "Welcome to Apex Institute of Technology! I can answer questions about our B.Tech and M.Tech engineering programs, curriculum, admissions criteria, and batch schedules. How can I assist you today?",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "msg-2",
        tenantId: apexId,
        conversationId: apexConvId,
        senderType: "student",
        content: "What are the eligibility criteria for B.Tech AI & Robotics?",
        createdAt: new Date(Date.now() - 3600000 * 2 + 60000).toISOString(),
      },
      {
        id: "msg-3",
        tenantId: apexId,
        conversationId: apexConvId,
        senderType: "assistant",
        content:
          "For B.Tech Artificial Intelligence & Robotics, applicants require a high school diploma with Mathematics and Physics (minimum 75% aggregate) and valid scores in SAT (1250+), JEE Main, or Apex Engineering Entrance Exam. What exam are you preparing for?",
        citations: [
          {
            title: "B.Tech Artificial Intelligence & Robotics",
            sourceType: "course",
            snippet:
              "Eligibility: High school diploma with Mathematics and Physics (min 75% aggregate) or equivalent.",
          },
        ],
        modelUsed: "deterministic-local-v1",
        createdAt: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
      },
    ]);
  }

  public getConfig(tenantId: string): AssistantConfigRecord {
    let cfg = this.configs.get(tenantId);
    if (!cfg) {
      const now = new Date().toISOString();
      cfg = {
        id: crypto.randomUUID(),
        tenantId,
        assistantName: "AdmitFlow Assistant",
        personaTitle: "Admissions Counselor",
        greetingMessage:
          "Hi! I am the official AI Admissions Assistant. How can I assist you with courses, fees, or eligibility today?",
        customSystemPrompt: "",
        tone: "welcoming_professional",
        isEnabled: true,
        handoffThreshold: 0.65,
        qualificationQuestions: [
          "What academic program or target exam are you preparing for?",
          "When are you planning to begin your studies?",
          "Do you prefer weekday morning or weekend batch schedules?",
        ],
        consentDisclaimer:
          "By sharing your contact details, you consent to receive admissions updates and counseling assistance.",
        rateLimitPerMinute: 15,
        createdAt: now,
        updatedAt: now,
      };
      this.configs.set(tenantId, cfg);
    }
    return cfg;
  }

  public updateConfig(
    tenantId: string,
    updates: UpdateAssistantConfigInput
  ): AssistantConfigRecord {
    const existing = this.getConfig(tenantId);
    const updated: AssistantConfigRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.configs.set(tenantId, updated);
    return updated;
  }

  public getTenantConversations(tenantId: string): ConversationRecord[] {
    if (!this.conversations.has(tenantId)) {
      this.conversations.set(tenantId, []);
    }
    return this.conversations.get(tenantId)!;
  }

  public getConversationBySession(
    tenantId: string,
    sessionId: string
  ): ConversationRecord | null {
    const list = this.getTenantConversations(tenantId);
    return list.find((c) => c.sessionId === sessionId) || null;
  }

  public getConversationById(
    tenantId: string,
    conversationId: string
  ): ConversationRecord | null {
    const list = this.getTenantConversations(tenantId);
    return list.find((c) => c.id === conversationId) || null;
  }

  public saveConversation(conv: ConversationRecord): void {
    const list = this.getTenantConversations(conv.tenantId);
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
  }

  public getMessages(conversationId: string): ConversationMessageRecord[] {
    return this.messages.get(conversationId) || [];
  }

  public addMessage(msg: ConversationMessageRecord): void {
    if (!this.messages.has(msg.conversationId)) {
      this.messages.set(msg.conversationId, []);
    }
    this.messages.get(msg.conversationId)!.push(msg);
  }

  public addUsageLog(log: AIUsageLogRecord): void {
    if (!this.usageLogs.has(log.tenantId)) {
      this.usageLogs.set(log.tenantId, []);
    }
    this.usageLogs.get(log.tenantId)!.unshift(log);
  }

  public getUsageLogs(tenantId: string, limit: number = 50): AIUsageLogRecord[] {
    const logs = this.usageLogs.get(tenantId) || [];
    return logs.slice(0, limit);
  }
}

const devConvStore = new InMemoryConversationStore();

export class ConversationService {
  private static getVerifiedTenantId(session: AuthSession): string {
    const tenantId =
      session.currentTenant?.id ||
      session.memberships?.[0]?.tenantId ||
      (session.user as any)?.tenantId;
    if (!session.isAuthenticated || !tenantId) {
      throw new Error("Authentication required: No verified tenant membership found.");
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
      throw new Error("Access denied: Only Institute Administrators can modify assistant configurations.");
    }
  }

  /**
   * Get or initialize the assistant configuration for a tenant.
   */
  public static async getAssistantConfig(tenantId: string): Promise<AssistantConfigRecord> {
    if (!tenantId) {
      throw new Error("Tenant ID is required to fetch assistant config.");
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("assistant_configs")
          .select("*")
          .eq("tenant_id", tenantId)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
          return {
            id: data.id,
            tenantId: data.tenant_id,
            assistantName: data.assistant_name,
            personaTitle: data.persona_title,
            greetingMessage: data.greeting_message,
            customSystemPrompt: data.custom_system_prompt || "",
            tone: data.tone as AssistantTone,
            isEnabled: Boolean(data.is_enabled),
            handoffThreshold: Number(data.handoff_threshold),
            qualificationQuestions: data.qualification_questions || [],
            consentDisclaimer: data.consent_disclaimer,
            rateLimitPerMinute: data.rate_limit_per_minute,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn("[ConversationService.getAssistantConfig] Fallback to local store:", err);
      }
    }

    return devConvStore.getConfig(tenantId);
  }

  /**
   * Update assistant configuration (Institute Admin only).
   */
  public static async updateAssistantConfig(
    session: AuthSession,
    updates: UpdateAssistantConfigInput
  ): Promise<AssistantConfigRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const dbUpdates: any = { updated_at: now };
        if (updates.assistantName !== undefined) dbUpdates.assistant_name = updates.assistantName.trim();
        if (updates.personaTitle !== undefined) dbUpdates.persona_title = updates.personaTitle.trim();
        if (updates.greetingMessage !== undefined) dbUpdates.greeting_message = updates.greetingMessage.trim();
        if (updates.customSystemPrompt !== undefined) dbUpdates.custom_system_prompt = updates.customSystemPrompt.trim();
        if (updates.tone !== undefined) dbUpdates.tone = updates.tone;
        if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
        if (updates.handoffThreshold !== undefined) dbUpdates.handoff_threshold = updates.handoffThreshold;
        if (updates.qualificationQuestions !== undefined) dbUpdates.qualification_questions = updates.qualificationQuestions;
        if (updates.consentDisclaimer !== undefined) dbUpdates.consent_disclaimer = updates.consentDisclaimer.trim();
        if (updates.rateLimitPerMinute !== undefined) dbUpdates.rate_limit_per_minute = updates.rateLimitPerMinute;

        const { data, error } = await supabase
          .from("assistant_configs")
          .update(dbUpdates)
          .eq("tenant_id", tenantId)
          .select("*")
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            tenantId: data.tenant_id,
            assistantName: data.assistant_name,
            personaTitle: data.persona_title,
            greetingMessage: data.greeting_message,
            customSystemPrompt: data.custom_system_prompt || "",
            tone: data.tone as AssistantTone,
            isEnabled: Boolean(data.is_enabled),
            handoffThreshold: Number(data.handoff_threshold),
            qualificationQuestions: data.qualification_questions || [],
            consentDisclaimer: data.consent_disclaimer,
            rateLimitPerMinute: data.rate_limit_per_minute,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn("[ConversationService.updateAssistantConfig] Fallback to local store:", err);
      }
    }

    return devConvStore.updateConfig(tenantId, updates);
  }

  /**
   * Get conversation by session ID (visitor or widget context).
   */
  public static async getConversationBySession(
    tenantId: string,
    sessionId: string
  ): Promise<ConversationRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("conversations")
          .select("*, messages:conversation_messages(count)")
          .eq("tenant_id", tenantId)
          .eq("session_id", sessionId)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
          return this.mapDbConversation(data);
        }
      } catch (err) {
        console.warn("[ConversationService.getConversationBySession] Fallback to local store:", err);
      }
    }

    return devConvStore.getConversationBySession(tenantId, sessionId);
  }

  /**
   * Get or create a persistent conversation for a session.
   */
  public static async getOrCreateConversation(
    tenantId: string,
    sessionId: string
  ): Promise<ConversationRecord> {
    const existing = await this.getConversationBySession(tenantId, sessionId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const newConv: ConversationRecord = {
      id: crypto.randomUUID(),
      tenantId,
      leadId: null,
      sessionId,
      status: "active",
      studentName: null,
      studentEmail: null,
      studentPhone: null,
      courseInterest: null,
      targetExam: null,
      preferredBatch: null,
      joiningTimeline: null,
      counsellingPreference: null,
      objections: [],
      summary: "Inquiry initiated by website visitor.",
      qualificationStage: "greeting",
      handoffReason: null,
      handoffRequestedAt: null,
      consentGiven: false,
      consentTimestamp: null,
      metadata: { initiatedVia: "website_chat_widget" },
      createdAt: now,
      updatedAt: now,
      messagesCount: 0,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("conversations").insert({
          id: newConv.id,
          tenant_id: newConv.tenantId,
          session_id: newConv.sessionId,
          status: newConv.status,
          summary: newConv.summary,
          qualification_stage: newConv.qualificationStage,
          consent_given: newConv.consentGiven,
          metadata: newConv.metadata,
        });
      } catch (err) {
        console.warn("[ConversationService.getOrCreateConversation] Fallback to local store:", err);
      }
    }

    devConvStore.saveConversation(newConv);

    // Insert initial assistant greeting message
    const config = await this.getAssistantConfig(tenantId);
    const greetingMsg: ConversationMessageRecord = {
      id: crypto.randomUUID(),
      tenantId,
      conversationId: newConv.id,
      senderType: "assistant",
      content: config.greetingMessage,
      citations: [],
      createdAt: now,
    };

    await this.saveMessage(greetingMsg);
    newConv.messagesCount = 1;

    return newConv;
  }

  /**
   * List conversations for current authorized tenant (Staff / Admin view).
   */
  public static async listConversations(
    session: AuthSession,
    params: ConversationFilterParams = {}
  ): Promise<ConversationRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);

    let list = devConvStore.getTenantConversations(tenantId);

    if (params.status && params.status !== "all") {
      list = list.filter((c) => c.status === params.status);
    }

    if (params.hasLead !== undefined) {
      list = list.filter((c) => (params.hasLead ? c.leadId !== null : c.leadId === null));
    }

    if (params.hasObjections) {
      list = list.filter((c) => c.objections && c.objections.length > 0);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.studentName && c.studentName.toLowerCase().includes(q)) ||
          (c.studentEmail && c.studentEmail.toLowerCase().includes(q)) ||
          (c.studentPhone && c.studentPhone.toLowerCase().includes(q)) ||
          (c.courseInterest && c.courseInterest.toLowerCase().includes(q)) ||
          c.summary.toLowerCase().includes(q)
      );
    }

    // Attach message counts
    return list.map((c) => ({
      ...c,
      messagesCount: devConvStore.getMessages(c.id).length,
    }));
  }

  /**
   * Get message history for a conversation.
   */
  public static async getMessages(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationMessageRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("conversation_messages")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((m: any) => ({
            id: m.id,
            tenantId: m.tenant_id,
            conversationId: m.conversation_id,
            senderType: m.sender_type,
            content: m.content,
            extractedData: m.extracted_data,
            citations: m.citations,
            modelUsed: m.model_used,
            promptTokens: m.prompt_tokens,
            completionTokens: m.completion_tokens,
            createdAt: m.created_at,
          }));
        }
      } catch (err) {
        console.warn("[ConversationService.getMessages] Fallback to local store:", err);
      }
    }

    return devConvStore.getMessages(conversationId);
  }

  /**
   * Save a single message in persistent history.
   */
  public static async saveMessage(
    message: Omit<ConversationMessageRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }
  ): Promise<ConversationMessageRecord> {
    const fullMsg: ConversationMessageRecord = {
      id: message.id || crypto.randomUUID(),
      tenantId: message.tenantId,
      conversationId: message.conversationId,
      senderType: message.senderType,
      content: message.content,
      extractedData: message.extractedData || {},
      citations: message.citations || [],
      modelUsed: message.modelUsed || null,
      promptTokens: message.promptTokens || 0,
      completionTokens: message.completionTokens || 0,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("conversation_messages").insert({
          id: fullMsg.id,
          tenant_id: fullMsg.tenantId,
          conversation_id: fullMsg.conversationId,
          sender_type: fullMsg.senderType,
          content: fullMsg.content,
          extracted_data: fullMsg.extractedData,
          citations: fullMsg.citations,
          model_used: fullMsg.modelUsed,
          prompt_tokens: fullMsg.promptTokens,
          completion_tokens: fullMsg.completionTokens,
          created_at: fullMsg.createdAt,
        });
      } catch (err) {
        console.warn("[ConversationService.saveMessage] Fallback to local store:", err);
      }
    }

    devConvStore.addMessage(fullMsg);
    return fullMsg;
  }

  /**
   * Update conversation state and CRM links.
   */
  public static async updateConversation(
    tenantId: string,
    conversationId: string,
    updates: Partial<ConversationRecord>
  ): Promise<ConversationRecord> {
    const existing = devConvStore.getConversationById(tenantId, conversationId);
    if (!existing) {
      throw new Error(`Conversation ${conversationId} not found.`);
    }

    const updated: ConversationRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const dbUpdates: any = { updated_at: updated.updatedAt };
        if (updates.leadId !== undefined) dbUpdates.lead_id = updates.leadId;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.studentName !== undefined) dbUpdates.student_name = updates.studentName;
        if (updates.studentEmail !== undefined) dbUpdates.student_email = updates.studentEmail;
        if (updates.studentPhone !== undefined) dbUpdates.student_phone = updates.studentPhone;
        if (updates.courseInterest !== undefined) dbUpdates.course_interest = updates.courseInterest;
        if (updates.targetExam !== undefined) dbUpdates.target_exam = updates.targetExam;
        if (updates.preferredBatch !== undefined) dbUpdates.preferred_batch = updates.preferredBatch;
        if (updates.joiningTimeline !== undefined) dbUpdates.joining_timeline = updates.joiningTimeline;
        if (updates.counsellingPreference !== undefined) dbUpdates.counselling_preference = updates.counsellingPreference;
        if (updates.objections !== undefined) dbUpdates.objections = updates.objections;
        if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
        if (updates.qualificationStage !== undefined) dbUpdates.qualification_stage = updates.qualificationStage;
        if (updates.handoffReason !== undefined) dbUpdates.handoff_reason = updates.handoffReason;
        if (updates.handoffRequestedAt !== undefined) dbUpdates.handoff_requested_at = updates.handoffRequestedAt;
        if (updates.consentGiven !== undefined) dbUpdates.consent_given = updates.consentGiven;
        if (updates.consentTimestamp !== undefined) dbUpdates.consent_timestamp = updates.consentTimestamp;

        await supabase
          .from("conversations")
          .update(dbUpdates)
          .eq("id", conversationId)
          .eq("tenant_id", tenantId);
      } catch (err) {
        console.warn("[ConversationService.updateConversation] Fallback to local store:", err);
      }
    }

    devConvStore.saveConversation(updated);
    return updated;
  }

  /**
   * Log AI provider token usage, latency, and status.
   */
  public static async logAIUsage(
    log: Omit<AIUsageLogRecord, "id" | "createdAt">
  ): Promise<AIUsageLogRecord> {
    const fullLog: AIUsageLogRecord = {
      id: crypto.randomUUID(),
      tenantId: log.tenantId,
      conversationId: log.conversationId || null,
      provider: log.provider,
      model: log.model,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      totalTokens: log.totalTokens,
      status: log.status,
      errorMessage: log.errorMessage || null,
      latencyMs: log.latencyMs,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        await supabase.from("ai_usage_logs").insert({
          id: fullLog.id,
          tenant_id: fullLog.tenantId,
          conversation_id: fullLog.conversationId,
          provider: fullLog.provider,
          model: fullLog.model,
          prompt_tokens: fullLog.promptTokens,
          completion_tokens: fullLog.completionTokens,
          total_tokens: fullLog.totalTokens,
          status: fullLog.status,
          error_message: fullLog.errorMessage,
          latency_ms: fullLog.latencyMs,
          created_at: fullLog.createdAt,
        });
      } catch (err) {
        console.warn("[ConversationService.logAIUsage] Fallback to local store:", err);
      }
    }

    devConvStore.addUsageLog(fullLog);
    return fullLog;
  }

  /**
   * Get recent AI usage and error logs for an institute.
   */
  public static async getAIUsageLogs(
    session: AuthSession,
    limit: number = 50
  ): Promise<AIUsageLogRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    return devConvStore.getUsageLogs(tenantId, limit);
  }

  private static mapDbConversation(data: any): ConversationRecord {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      leadId: data.lead_id,
      sessionId: data.session_id,
      status: data.status,
      studentName: data.student_name,
      studentEmail: data.student_email,
      studentPhone: data.student_phone,
      courseInterest: data.course_interest,
      targetExam: data.target_exam,
      preferredBatch: data.preferred_batch,
      joiningTimeline: data.joining_timeline,
      counsellingPreference: data.counselling_preference,
      objections: data.objections || [],
      summary: data.summary || "",
      qualificationStage: data.qualification_stage,
      handoffReason: data.handoff_reason,
      handoffRequestedAt: data.handoff_requested_at,
      consentGiven: Boolean(data.consent_given),
      consentTimestamp: data.consent_timestamp,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      messagesCount: Array.isArray(data.messages)
        ? data.messages[0]?.count || 0
        : Number(data.messages?.count || 0),
    };
  }
}
