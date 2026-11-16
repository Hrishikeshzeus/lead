import type { AuthSession, AppRole } from "../auth/types.ts";
import type {
  FollowUpTaskRecord,
  FollowUpSequenceRecord,
  CreateFollowUpTaskInput,
  UpdateFollowUpTaskInput,
  CreateSequenceInput,
  UpdateSequenceInput,
  FollowUpTaskFilterParams,
  InactiveLeadRecoveryItem,
  ReviewAIDraftInput,
  FollowUpTaskStatus,
  FollowUpChannel,
  AIDraftStatus,
} from "../../types/followup.ts";
import { LeadService } from "../leads/service.ts";
import { ConversationService } from "../conversations/service.ts";
import { isSupabaseConfigured } from "../supabase/client.ts";
import { createClient } from "../supabase/server.ts";

class InMemoryFollowUpStore {
  private sequences: Map<string, FollowUpSequenceRecord[]> = new Map();
  private tasks: Map<string, FollowUpTaskRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";
    const now = new Date();

    // 1. Apex Sequences
    const apexSeq1: FollowUpSequenceRecord = {
      id: "f0000001-0000-0000-0000-000000000001",
      tenantId: apexId,
      name: "New Applicant Fast Response Sequence",
      targetAudience: "new_lead",
      isActive: true,
      stopConditions: ["reply", "opt_out", "admitted", "lost", "handoff"],
      steps: [
        {
          stepNumber: 1,
          delayHours: 2,
          channel: "call",
          actionType: "counsellor_reminder",
          templateTitle: "Initial Welcome & Verification Call",
          aiPromptInstruction:
            "Generate a phone conversation opening verifying interest in B.Tech engineering and checking SAT or JEE readiness.",
        },
        {
          stepNumber: 2,
          delayHours: 24,
          channel: "whatsapp",
          actionType: "ai_draft_review",
          templateTitle: "Curriculum & Batch Schedule Brochure",
          aiPromptInstruction:
            "Draft a personalized WhatsApp follow-up sharing the morning cohort schedule and research lab tour information.",
        },
        {
          stepNumber: 3,
          delayHours: 72,
          channel: "email",
          actionType: "counsellor_reminder",
          templateTitle: "Merit Scholarship Deadline Reminder",
          aiPromptInstruction:
            "Highlight the Dean Merit Scholarship deadline of July 15 and invite questions on financial assistance.",
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const apexSeq2: FollowUpSequenceRecord = {
      id: "f0000001-0000-0000-0000-000000000002",
      tenantId: apexId,
      name: "Inactive Lead Re-Engagement Sequence",
      targetAudience: "inactive_lead",
      isActive: true,
      stopConditions: ["reply", "opt_out", "admitted", "lost", "handoff"],
      steps: [
        {
          stepNumber: 1,
          delayHours: 0,
          channel: "whatsapp",
          actionType: "ai_draft_review",
          templateTitle: "Intake Seat Availability Check",
          aiPromptInstruction:
            "Draft a gentle check-in regarding remaining seats in the applicant preferred batch and asking if timeline changed.",
        },
        {
          stepNumber: 2,
          delayHours: 48,
          channel: "call",
          actionType: "counsellor_reminder",
          templateTitle: "Personalized Academic Counseling Call",
          aiPromptInstruction:
            "Prepare speaking notes addressing any fee or schedule concerns and offering a 1-on-1 counselor appointment.",
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.sequences.set(apexId, [apexSeq1, apexSeq2]);

    // 2. Beacon Sequences
    const beaconSeq1: FollowUpSequenceRecord = {
      id: "f0000002-0000-0000-0000-000000000001",
      tenantId: beaconId,
      name: "International Visa & Document Sequence",
      targetAudience: "qualified_lead",
      isActive: true,
      stopConditions: ["reply", "opt_out", "admitted", "lost", "handoff"],
      steps: [
        {
          stepNumber: 1,
          delayHours: 6,
          channel: "email",
          actionType: "ai_draft_review",
          templateTitle: "F-1 Visa Document Checklist",
          aiPromptInstruction:
            "Draft an email outlining passport validity and financial affidavit requirements for Beacon international programs.",
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.sequences.set(beaconId, [beaconSeq1]);

    // 3. Seed Apex Follow-Up Tasks (Due, Overdue, Completed)
    const dueTime = new Date(now.getTime() + 4 * 3600000).toISOString();
    const overdueTime = new Date(now.getTime() - 26 * 3600000).toISOString();
    const completedTime = new Date(now.getTime() - 48 * 3600000).toISOString();

    const apexTasks: FollowUpTaskRecord[] = [
      {
        id: "tk111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        sequenceId: apexSeq1.id,
        sequenceStep: 1,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        title: "Call Alex Rivera regarding SAT 1450 verification",
        description: "Verify SAT score submission and schedule preference for B.Tech AI & Robotics.",
        channel: "call",
        priority: "high",
        status: "due",
        dueAt: dueTime,
        timezone: "America/New_York",
        suggestedAction: "Call student to confirm entrance exam documents and invite to robotics lab tour.",
        aiDraft:
          "Hi Alex! This is Ada Lovelace from Apex Institute of Technology Admissions. Congratulations on your strong SAT score of 1450! I noticed your interest in our B.Tech Artificial Intelligence program. Do you have 5 minutes to discuss our Morning Cohort schedule?",
        aiDraftStatus: "pending_review",
        studentName: "Alex Rivera",
        studentEmail: "alex.rivera@example.com",
        studentPhone: "+1-555-1101",
        courseInterest: "B.Tech Computer Science & AI",
        leadStatus: "counselling_booked",
        metadata: {},
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "tk111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000002",
        sequenceId: apexSeq1.id,
        sequenceStep: 2,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        title: "WhatsApp brochure follow-up with Priya Sharma",
        description: "Student inquired about JEE Cutoffs. Follow up with department prospectus.",
        channel: "whatsapp",
        priority: "urgent",
        status: "overdue",
        dueAt: overdueTime,
        timezone: "Asia/Kolkata",
        suggestedAction: "Send WhatsApp message with approved fee installment details.",
        aiDraft:
          "Hello Priya! Following up on your inquiry with Apex Institute of Technology. Our admissions cutoff for B.Tech CSE is currently open. Would you like to review our curriculum breakdown?",
        aiDraftStatus: "approved",
        studentName: "Priya Sharma",
        studentEmail: "priya.sharma@example.com",
        studentPhone: "+91-98765-43210",
        courseInterest: "B.Tech Computer Science & AI",
        leadStatus: "contacted",
        metadata: {},
        createdAt: new Date(now.getTime() - 30 * 3600000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "tk111111-0000-0000-0000-000000000003",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000003",
        sequenceId: null,
        sequenceStep: 1,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        title: "Initial consultation completed with Marcus Chen",
        description: "Completed initial intake consultation.",
        channel: "call",
        priority: "medium",
        status: "completed",
        dueAt: completedTime,
        completedAt: completedTime,
        timezone: "America/Los_Angeles",
        suggestedAction: "Follow up with application link.",
        aiDraft: "Marcus Chen consultation completed successfully.",
        aiDraftStatus: "sent",
        studentName: "Marcus Chen",
        studentEmail: "marcus.chen@example.com",
        studentPhone: "+1-555-2202",
        courseInterest: "B.Tech Computer Science & AI",
        leadStatus: "qualified",
        metadata: {},
        createdAt: new Date(now.getTime() - 50 * 3600000).toISOString(),
        updatedAt: completedTime,
      },
    ];

    this.tasks.set(apexId, apexTasks);
  }

  public getTenantSequences(tenantId: string): FollowUpSequenceRecord[] {
    if (!this.sequences.has(tenantId)) {
      this.sequences.set(tenantId, []);
    }
    return this.sequences.get(tenantId)!;
  }

  public getSequence(tenantId: string, id: string): FollowUpSequenceRecord | null {
    return this.getTenantSequences(tenantId).find((s) => s.id === id) || null;
  }

  public saveSequence(seq: FollowUpSequenceRecord): void {
    const list = this.getTenantSequences(seq.tenantId);
    const idx = list.findIndex((s) => s.id === seq.id);
    if (idx >= 0) {
      list[idx] = seq;
    } else {
      list.unshift(seq);
    }
  }

  public getTenantTasks(tenantId: string): FollowUpTaskRecord[] {
    if (!this.tasks.has(tenantId)) {
      this.tasks.set(tenantId, []);
    }
    return this.tasks.get(tenantId)!;
  }

  public getTask(tenantId: string, id: string): FollowUpTaskRecord | null {
    return this.getTenantTasks(tenantId).find((t) => t.id === id) || null;
  }

  public saveTask(task: FollowUpTaskRecord): void {
    const list = this.getTenantTasks(task.tenantId);
    const idx = list.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      list[idx] = task;
    } else {
      list.unshift(task);
    }
  }
}

const devFollowUpStore = new InMemoryFollowUpStore();

export class FollowUpService {
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
      throw new Error("Access denied: Institute Admin role required.");
    }
  }

  /**
   * List follow-up tasks with state calculation (due vs overdue).
   */
  public static async listTasks(
    session: AuthSession,
    params: FollowUpTaskFilterParams = {}
  ): Promise<FollowUpTaskRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const now = new Date();

    let list = devFollowUpStore.getTenantTasks(tenantId);

    // Dynamic state update: if status is 'due' and dueAt < now, evaluate as 'overdue'
    list = list.map((task) => {
      if (task.status === "due" && new Date(task.dueAt) < now) {
        return { ...task, status: "overdue" as FollowUpTaskStatus };
      }
      return task;
    });

    if (params.status && params.status !== "all") {
      list = list.filter((t) => t.status === params.status);
    }

    if (params.channel && params.channel !== "all") {
      list = list.filter((t) => t.channel === params.channel);
    }

    if (params.priority && params.priority !== "all") {
      list = list.filter((t) => t.priority === params.priority);
    }

    if (params.assignedCounsellorId && params.assignedCounsellorId !== "all") {
      list = list.filter((t) => t.assignedCounsellorId === params.assignedCounsellorId);
    }

    if (params.leadId) {
      list = list.filter((t) => t.leadId === params.leadId);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.studentName && t.studentName.toLowerCase().includes(q)) ||
          (t.courseInterest && t.courseInterest.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }

  /**
   * Create a new follow-up task.
   */
  public static async createTask(
    session: AuthSession,
    input: CreateFollowUpTaskInput
  ): Promise<FollowUpTaskRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.title || !input.title.trim()) {
      throw new Error("Task title is required.");
    }
    if (!input.leadId) {
      throw new Error("Lead ID is required.");
    }
    if (!input.dueAt) {
      throw new Error("Due date/time is required.");
    }

    // Load lead details
    const leadDetails = await LeadService.getLeadById(session, input.leadId);
    const lead = leadDetails?.lead;
    if (!lead) {
      throw new Error(`Lead ${input.leadId} not found.`);
    }

    const now = new Date();
    const isPast = new Date(input.dueAt) < now;

    // Generate AI draft if requested
    let aiDraft = "";
    let aiDraftStatus: AIDraftStatus = "none";
    let suggestedAction = input.suggestedAction || "";

    if (input.generateDraft && lead) {
      aiDraft = this.synthesizeAIDraft(
        lead.studentName,
        lead.courseInterest,
        lead.targetExam,
        lead.preferredBatch,
        input.channel || "call"
      );
      aiDraftStatus = "pending_review";
      suggestedAction = `Review AI follow-up draft for ${lead.studentName} regarding ${lead.courseInterest}.`;
    }

    const newTask: FollowUpTaskRecord = {
      id: crypto.randomUUID(),
      tenantId,
      leadId: input.leadId,
      sequenceId: input.sequenceId || null,
      sequenceStep: input.sequenceStep || 1,
      assignedCounsellorId: input.assignedCounsellorId || session.user?.id || null,
      assignedCounsellorName: session.user?.fullName || null,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      channel: input.channel || "call",
      priority: input.priority || "medium",
      status: isPast ? "overdue" : "due",
      dueAt: new Date(input.dueAt).toISOString(),
      timezone: input.timezone || "UTC",
      suggestedAction,
      aiDraft,
      aiDraftStatus,
      studentName: lead?.studentName,
      studentEmail: lead?.email,
      studentPhone: lead?.phone,
      courseInterest: lead?.courseInterest,
      leadStatus: lead?.status,
      metadata: {},
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    devFollowUpStore.saveTask(newTask);

    // Log lead activity
    try {
      await LeadService.addNoteActivity(
        session,
        input.leadId,
        `Follow-up task scheduled: "${newTask.title}" (Due: ${new Date(newTask.dueAt).toLocaleString()})`
      );
    } catch {
      // Non-fatal if note activity fails
    }

    return newTask;
  }

  /**
   * Complete a follow-up task.
   */
  public static async completeTask(
    session: AuthSession,
    taskId: string
  ): Promise<FollowUpTaskRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const task = devFollowUpStore.getTask(tenantId, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found or access denied.`);
    }

    const now = new Date().toISOString();
    const updated: FollowUpTaskRecord = {
      ...task,
      status: "completed",
      completedAt: now,
      completedBy: session.user?.id || null,
      updatedAt: now,
    };

    devFollowUpStore.saveTask(updated);

    // Add note in lead activity
    try {
      await LeadService.addNoteActivity(
        session,
        task.leadId,
        `Follow-up task completed: "${task.title}".`
      );
    } catch {
      // Non-fatal
    }

    return updated;
  }

  /**
   * Cancel a follow-up task.
   */
  public static async cancelTask(
    session: AuthSession,
    taskId: string,
    reason: string
  ): Promise<FollowUpTaskRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const task = devFollowUpStore.getTask(tenantId, taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found or access denied.`);
    }

    const now = new Date().toISOString();
    const updated: FollowUpTaskRecord = {
      ...task,
      status: "cancelled",
      cancelledReason: reason || "Cancelled by admissions staff.",
      cancelledAt: now,
      updatedAt: now,
    };

    devFollowUpStore.saveTask(updated);
    return updated;
  }

  /**
   * Review an AI-generated draft (approve/reject/edit).
   * Strictly allows human-in-the-loop review.
   */
  public static async reviewAIDraft(
    session: AuthSession,
    input: ReviewAIDraftInput
  ): Promise<FollowUpTaskRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const task = devFollowUpStore.getTask(tenantId, input.taskId);

    if (!task) {
      throw new Error(`Task ${input.taskId} not found.`);
    }

    const now = new Date().toISOString();
    const updated: FollowUpTaskRecord = {
      ...task,
      aiDraftStatus: input.status,
      aiDraft: input.editedDraft !== undefined ? input.editedDraft.trim() : task.aiDraft,
      reviewedBy: session.user?.id || null,
      reviewedByName: session.user?.fullName || null,
      reviewedAt: now,
      updatedAt: now,
    };

    devFollowUpStore.saveTask(updated);
    return updated;
  }

  /**
   * Lead Recovery Detector: identifies leads with no recent activity
   * and computes suggested next actions based on stage and history.
   */
  public static async getInactiveLeads(
    session: AuthSession,
    daysThreshold: number = 3
  ): Promise<InactiveLeadRecoveryItem[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const now = Date.now();
    const msPerDay = 86_400_000;

    // Fetch active leads for this tenant
    const leadsResult = await LeadService.listLeads(session, {
      isArchived: false,
      pageSize: 100,
    });

    const activeTasks = devFollowUpStore.getTenantTasks(tenantId).filter(
      (t) => t.status === "due" || t.status === "overdue"
    );

    const recoveryItems: InactiveLeadRecoveryItem[] = [];

    for (const lead of leadsResult.leads) {
      // Exclude admitted or lost leads from recovery
      if (lead.status === "admitted" || lead.status === "lost") continue;

      const lastUpdate = new Date(lead.updatedAt).getTime();
      const daysInactive = Math.floor((now - lastUpdate) / msPerDay);

      if (daysInactive >= daysThreshold) {
        // Derive suggested next action based on lead stage and context
        let suggestedAction = "Follow up to re-engage prospective student.";
        if (lead.status === "new") {
          suggestedAction = "Send introductory curriculum brochure and check entrance exam readiness.";
        } else if (lead.status === "contacted") {
          suggestedAction = "Offer personalized 1-on-1 counselor appointment to address batch or fee questions.";
        } else if (lead.status === "qualified") {
          suggestedAction = "Share scholarship criteria and upcoming batch enrollment deadlines.";
        } else if (lead.status === "counselling_booked") {
          suggestedAction = "Confirm scheduled counseling slot and send meeting reminder.";
        }

        const leadTaskCount = activeTasks.filter((t) => t.leadId === lead.id).length;

        recoveryItems.push({
          leadId: lead.id,
          studentName: lead.studentName,
          email: lead.email,
          phone: lead.phone,
          courseInterest: lead.courseInterest,
          leadStatus: lead.status,
          assignedCounsellorName: lead.assignedCounsellorName,
          daysInactive,
          lastActivityDate: lead.updatedAt,
          lastActivityDescription: `Last profile update was ${daysInactive} days ago.`,
          suggestedAction,
          recommendedSequenceId: "f0000001-0000-0000-0000-000000000002",
          activeFollowupCount: leadTaskCount,
        });
      }
    }

    return recoveryItems.sort((a, b) => b.daysInactive - a.daysInactive);
  }

  /**
   * Follow-up Sequence Management
   */
  public static async listSequences(session: AuthSession): Promise<FollowUpSequenceRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    return devFollowUpStore.getTenantSequences(tenantId);
  }

  public static async createSequence(
    session: AuthSession,
    input: CreateSequenceInput
  ): Promise<FollowUpSequenceRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.name || !input.name.trim()) {
      throw new Error("Sequence name is required.");
    }
    if (!input.steps || input.steps.length === 0) {
      throw new Error("At least one sequence step is required.");
    }

    const now = new Date().toISOString();
    const newSeq: FollowUpSequenceRecord = {
      id: crypto.randomUUID(),
      tenantId,
      name: input.name.trim(),
      targetAudience: input.targetAudience,
      isActive: input.isActive ?? true,
      stopConditions: input.stopConditions || ["reply", "opt_out", "admitted", "lost", "handoff"],
      steps: input.steps,
      createdAt: now,
      updatedAt: now,
    };

    devFollowUpStore.saveSequence(newSeq);
    return newSeq;
  }

  public static async toggleSequenceActive(
    session: AuthSession,
    sequenceId: string,
    isActive: boolean
  ): Promise<FollowUpSequenceRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const seq = devFollowUpStore.getSequence(tenantId, sequenceId);
    if (!seq) {
      throw new Error("Sequence not found.");
    }

    const updated: FollowUpSequenceRecord = {
      ...seq,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    devFollowUpStore.saveSequence(updated);
    return updated;
  }

  /**
   * Stop all active sequences and pending tasks for a lead
   * when stop conditions are met (reply, opt-out, admitted, lost, handoff).
   */
  public static async stopSequencesForLead(
    tenantId: string,
    leadId: string,
    reason: string
  ): Promise<number> {
    const tasks = devFollowUpStore.getTenantTasks(tenantId);
    const now = new Date().toISOString();
    let cancelledCount = 0;

    tasks.forEach((task) => {
      if (task.leadId === leadId && (task.status === "due" || task.status === "overdue")) {
        task.status = "cancelled";
        task.cancelledReason = `Sequence stopped: ${reason}`;
        task.cancelledAt = now;
        task.updatedAt = now;
        cancelledCount++;
      }
    });

    return cancelledCount;
  }

  /**
   * Helper: synthesize AI-generated follow-up draft based on student context.
   */
  public static synthesizeAIDraft(
    studentName: string,
    courseInterest: string,
    targetExam?: string | null,
    preferredBatch?: string | null,
    channel: FollowUpChannel = "call"
  ): string {
    const examSnippet = targetExam ? ` regarding your preparation for ${targetExam}` : "";
    const batchSnippet = preferredBatch ? ` in our ${preferredBatch}` : "";

    if (channel === "call") {
      return `Admissions Call Script for ${studentName}:
1. Opening: "Hello ${studentName}! This is your academic admissions counselor calling from the admissions office."
2. Context: "I am following up on your inquiry for ${courseInterest}${examSnippet}."
3. Value Proposition: "We are finalizing batch allocations${batchSnippet}. Do you have 3 minutes to confirm your preferred schedule and scholarship eligibility?"
4. Next Step: "Invite student to virtual counseling or send program brochure."`;
    }

    if (channel === "whatsapp") {
      return `Hi ${studentName}! 👋 Following up from admissions regarding your interest in ${courseInterest}. We are currently reviewing applications${batchSnippet}. Would you like us to share our department syllabus and scholarship criteria with you here on WhatsApp?`;
    }

    if (channel === "email") {
      return `Subject: Next Steps for Your ${courseInterest} Application

Dear ${studentName},

Thank you for your interest in the ${courseInterest} program at our institution.

Our admissions committee is currently evaluating candidates${examSnippet}${batchSnippet}. We would love to assist you with any questions regarding curriculum, eligibility, or merit financial assistance.

Please let us know a convenient time for a brief 1-on-1 counseling call this week.

Warm regards,
Admissions Counseling Team`;
    }

    return `Follow-up draft for ${studentName} regarding ${courseInterest}.`;
  }
}
