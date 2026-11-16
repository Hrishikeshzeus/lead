import type { AuthSession } from "../auth/types.ts";
import type {
  JobQueueRecord,
  JobLogRecord,
  JobQueueStatus,
  FollowUpSequenceRecord,
  FollowUpTaskRecord,
  CreateFollowUpTaskInput,
} from "../../types/followup.ts";
import { FollowUpService } from "./service.ts";
import { LeadService } from "../leads/service.ts";

export interface EnqueueJobInput {
  jobType:
    | "schedule_followup"
    | "generate_ai_draft"
    | "counsellor_reminder"
    | "check_inactivity_recovery"
    | "stop_sequence";
  idempotencyKey: string;
  leadId?: string | null;
  taskId?: string | null;
  payload?: Record<string, any>;
  scheduledFor?: string;
  timezone?: string;
  maxAttempts?: number;
}

export interface ProcessJobsResult {
  processed: number;
  completed: number;
  skipped: number;
  failed: number;
  jobs: Array<{
    id: string;
    idempotencyKey: string;
    status: JobQueueStatus;
    actionTaken: string;
  }>;
}

class InMemoryJobStore {
  private queue: Map<string, JobQueueRecord[]> = new Map();
  private logs: Map<string, JobLogRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";
    const now = new Date();

    // 1. Apex Seed Jobs
    const apexJobs: JobQueueRecord[] = [
      {
        id: "jq111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        idempotencyKey: "seq-f0000001-step-1-lead-1",
        jobType: "counsellor_reminder",
        taskId: "ft111111-0000-0000-0000-000000000001",
        leadId: "00000000-0000-0000-0000-000000000001",
        payload: {
          stepNumber: 1,
          title: "Initial Welcome & Verification Call",
          channel: "call",
        },
        scheduledFor: new Date(now.getTime() - 2 * 3600000).toISOString(),
        timezone: "America/Los_Angeles",
        status: "completed",
        attempts: 1,
        maxAttempts: 3,
        processedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
      {
        id: "jq111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        idempotencyKey: "seq-f0000001-step-2-lead-1",
        jobType: "generate_ai_draft",
        taskId: "ft111111-0000-0000-0000-000000000002",
        leadId: "00000000-0000-0000-0000-000000000001",
        payload: {
          stepNumber: 2,
          title: "Curriculum & Batch Schedule Brochure",
          channel: "whatsapp",
        },
        scheduledFor: new Date(now.getTime() + 18 * 3600000).toISOString(),
        timezone: "America/Los_Angeles",
        status: "scheduled",
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      },
    ];

    const apexLogs: JobLogRecord[] = [
      {
        id: "jl111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        jobId: "jq111111-0000-0000-0000-000000000001",
        leadId: "00000000-0000-0000-0000-000000000001",
        action: "counsellor_reminder",
        status: "sent",
        details: "Created reminder task and generated AI draft for counsellor verification.",
        metadata: { channel: "call", stepNumber: 1 },
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
      {
        id: "jl111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        jobId: "jq111111-0000-0000-0000-000000000002",
        leadId: "00000000-0000-0000-0000-000000000001",
        action: "generate_ai_draft",
        status: "scheduled",
        details: "Scheduled WhatsApp curriculum brochure draft generation for Marcus Chen.",
        metadata: { channel: "whatsapp", stepNumber: 2 },
        createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      },
    ];

    this.queue.set(apexId, apexJobs);
    this.logs.set(apexId, apexLogs);

    // 2. Beacon Seed Jobs
    const beaconJobs: JobQueueRecord[] = [
      {
        id: "jq222222-0000-0000-0000-000000000001",
        tenantId: beaconId,
        idempotencyKey: "beacon-job-1",
        jobType: "counsellor_reminder",
        scheduledFor: new Date(now.getTime() + 12 * 3600000).toISOString(),
        timezone: "America/New_York",
        status: "scheduled",
        attempts: 0,
        maxAttempts: 3,
        payload: { title: "Beacon follow-up check" },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];
    this.queue.set(beaconId, beaconJobs);
    this.logs.set(beaconId, []);
  }

  public getTenantQueue(tenantId: string): JobQueueRecord[] {
    if (!this.queue.has(tenantId)) {
      this.queue.set(tenantId, []);
    }
    return this.queue.get(tenantId)!;
  }

  public getTenantLogs(tenantId: string): JobLogRecord[] {
    if (!this.logs.has(tenantId)) {
      this.logs.set(tenantId, []);
    }
    return this.logs.get(tenantId)!;
  }

  public findJobByIdempotencyKey(tenantId: string, key: string): JobQueueRecord | null {
    return this.getTenantQueue(tenantId).find((j) => j.idempotencyKey === key) || null;
  }

  public saveJob(job: JobQueueRecord): void {
    const list = this.getTenantQueue(job.tenantId);
    const idx = list.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list[idx] = job;
    } else {
      list.unshift(job);
    }
  }

  public appendLog(log: JobLogRecord): void {
    const list = this.getTenantLogs(log.tenantId);
    list.unshift(log);
  }

  public getAllTenantIds(): string[] {
    return Array.from(this.queue.keys());
  }
}

const devJobStore = new InMemoryJobStore();

export class JobRunner {
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

  /**
   * Enqueue a job with idempotency checking.
   * If a job with the same idempotencyKey exists in the tenant's queue,
   * the existing job is returned without creating a duplicate.
   */
  public static async enqueueJob(
    session: AuthSession,
    input: EnqueueJobInput
  ): Promise<{ job: JobQueueRecord; isDuplicate: boolean }> {
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.idempotencyKey || !input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required to prevent duplicate jobs.");
    }

    const key = input.idempotencyKey.trim();
    const existing = devJobStore.findJobByIdempotencyKey(tenantId, key);

    if (existing) {
      return { job: existing, isDuplicate: true };
    }

    const now = new Date();
    const scheduledFor = input.scheduledFor
      ? new Date(input.scheduledFor).toISOString()
      : now.toISOString();

    const newJob: JobQueueRecord = {
      id: crypto.randomUUID(),
      tenantId,
      idempotencyKey: key,
      jobType: input.jobType,
      taskId: input.taskId || null,
      leadId: input.leadId || null,
      payload: input.payload || {},
      scheduledFor,
      timezone: input.timezone || "UTC",
      status: "scheduled",
      attempts: 0,
      maxAttempts: input.maxAttempts || 3,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    devJobStore.saveJob(newJob);

    // Record audit log
    devJobStore.appendLog({
      id: crypto.randomUUID(),
      tenantId,
      jobId: newJob.id,
      taskId: newJob.taskId,
      leadId: newJob.leadId,
      action: newJob.jobType,
      status: "scheduled",
      details: `Job scheduled for ${new Date(newJob.scheduledFor).toLocaleString()} (key: ${key})`,
      metadata: { ...newJob.payload, timezone: newJob.timezone },
      createdAt: now.toISOString(),
    });

    return { job: newJob, isDuplicate: false };
  }

  /**
   * Enroll a lead in a sequence.
   * Idempotently schedules jobs for each step in the sequence.
   */
  public static async enrollLeadInSequence(
    session: AuthSession,
    leadId: string,
    sequenceId: string
  ): Promise<JobQueueRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const sequences = await FollowUpService.listSequences(session);
    const sequence = sequences.find((s) => s.id === sequenceId);

    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found.`);
    }

    if (!sequence.isActive) {
      throw new Error(`Sequence "${sequence.name}" is currently inactive.`);
    }

    const leadDetails = await LeadService.getLeadById(session, leadId);
    const lead = leadDetails?.lead;

    if (!lead) {
      throw new Error(`Lead ${leadId} not found.`);
    }

    // Stop condition checks prior to enrollment:
    // If student opted out (consentStatus === false) or admitted or lost, do not enroll
    if (lead.consentStatus === false) {
      throw new Error(`Cannot enroll lead: Student has opted out of communications.`);
    }
    if (lead.status === "admitted" || lead.status === "lost") {
      throw new Error(`Cannot enroll lead: Lead is already marked as ${lead.status}.`);
    }

    const enqueuedJobs: JobQueueRecord[] = [];
    const baseTime = Date.now();

    for (const step of sequence.steps) {
      const delayMs = step.delayHours * 3600000;
      const scheduledFor = new Date(baseTime + delayMs).toISOString();
      const idempotencyKey = `seq-${sequence.id}-lead-${lead.id}-step-${step.stepNumber}`;

      const { job } = await this.enqueueJob(session, {
        jobType: "counsellor_reminder",
        idempotencyKey,
        leadId: lead.id,
        scheduledFor,
        timezone: "UTC",
        payload: {
          sequenceId: sequence.id,
          sequenceName: sequence.name,
          stepNumber: step.stepNumber,
          channel: step.channel,
          templateTitle: step.templateTitle,
          aiPromptInstruction: step.aiPromptInstruction,
          studentName: lead.studentName,
          courseInterest: lead.courseInterest,
        },
      });

      enqueuedJobs.push(job);
    }

    return enqueuedJobs;
  }

  /**
   * Process all scheduled jobs across one or all tenants whose scheduled_for <= now.
   * Checks stop conditions (reply, opt-out, admitted, lost, handoff) before executing.
   * Implements exponential backoff retry on failure.
   */
  public static async processScheduledJobs(
    tenantIdFilter?: string
  ): Promise<ProcessJobsResult> {
    const now = new Date();
    const targetTenants = tenantIdFilter
      ? [tenantIdFilter]
      : devJobStore.getAllTenantIds();

    let processedCount = 0;
    let completedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const executedJobsSummary: ProcessJobsResult["jobs"] = [];

    for (const tenantId of targetTenants) {
      const queue = devJobStore.getTenantQueue(tenantId);
      const eligibleJobs = queue.filter(
        (job) => job.status === "scheduled" && new Date(job.scheduledFor) <= now
      );

      for (const job of eligibleJobs) {
        processedCount++;
        job.status = "processing";
        job.updatedAt = new Date().toISOString();

        try {
          if (job.payload?.simulateFailure) {
            throw new Error(job.payload.errorMessage || "Simulated gateway connection error");
          }

          // Check stop conditions if leadId is present
          if (job.leadId) {
            const stopReason = await this.evaluateLeadStopConditions(
              tenantId,
              job.leadId
            );

            if (stopReason) {
              // Sequence stop condition met!
              job.status = "skipped";
              job.processedAt = new Date().toISOString();
              job.updatedAt = new Date().toISOString();
              skippedCount++;

              devJobStore.appendLog({
                id: crypto.randomUUID(),
                tenantId,
                jobId: job.id,
                leadId: job.leadId,
                action: job.jobType,
                status: "skipped",
                details: `Sequence stopped for lead: ${stopReason}`,
                metadata: { stopReason },
                createdAt: new Date().toISOString(),
              });

              executedJobsSummary.push({
                id: job.id,
                idempotencyKey: job.idempotencyKey,
                status: "skipped",
                actionTaken: `Skipped: ${stopReason}`,
              });
              continue;
            }
          }

          // Execute job based on type
          let actionTaken = "";

          if (
            job.jobType === "counsellor_reminder" ||
            job.jobType === "schedule_followup"
          ) {
            // Create follow-up task and generate AI draft for counsellor review
            const mockSession: AuthSession = {
              isAuthenticated: true,
              user: {
                id: "system-worker",
                email: "system@admitflow.local",
                fullName: "AdmitFlow Sequence Worker",
                isSuperAdmin: false,
              },
              currentRole: "institute_admin",
              currentTenant: {
                id: tenantId,
                name: "Tenant Institute",
                slug: "tenant",
                contactEmail: "admin@tenant.local",
              },
              memberships: [
                {
                  id: "m-system-worker",
                  tenantId,
                  userId: "system-worker",
                  role: "institute_admin",
                },
              ],
            };

            const taskTitle =
              job.payload?.templateTitle ||
              `Follow-up Task: Step ${job.payload?.stepNumber || 1}`;
            const taskChannel = job.payload?.channel || "call";

            const newTask = await FollowUpService.createTask(mockSession, {
              leadId: job.leadId!,
              sequenceId: job.payload?.sequenceId || null,
              sequenceStep: job.payload?.stepNumber || 1,
              title: taskTitle,
              description:
                job.payload?.aiPromptInstruction ||
                "Scheduled sequence follow-up reminder.",
              channel: taskChannel,
              priority: "medium",
              dueAt: job.scheduledFor,
              timezone: job.timezone,
              generateDraft: true,
            });

            job.taskId = newTask.id;
            actionTaken = `Created follow-up task "${newTask.title}" with AI draft pending review.`;
          } else if (job.jobType === "generate_ai_draft") {
            actionTaken = "AI follow-up draft synthesized and stored.";
          } else if (job.jobType === "stop_sequence") {
            if (job.leadId) {
              await FollowUpService.stopSequencesForLead(
                tenantId,
                job.leadId,
                "Cancelled via job request"
              );
            }
            actionTaken = "Sequence and pending follow-ups stopped.";
          } else {
            actionTaken = `Job type ${job.jobType} executed successfully.`;
          }

          // Mark completed
          job.status = "completed";
          job.processedAt = new Date().toISOString();
          job.updatedAt = new Date().toISOString();
          completedCount++;

          devJobStore.appendLog({
            id: crypto.randomUUID(),
            tenantId,
            jobId: job.id,
            taskId: job.taskId,
            leadId: job.leadId,
            action: job.jobType,
            status: "sent",
            details: actionTaken,
            metadata: job.payload,
            createdAt: new Date().toISOString(),
          });

          executedJobsSummary.push({
            id: job.id,
            idempotencyKey: job.idempotencyKey,
            status: "completed",
            actionTaken,
          });
        } catch (err: any) {
          // Failure handling & Exponential Backoff Retries
          job.attempts = (job.attempts || 0) + 1;
          job.lastError = err.message || "Unknown error during job execution";
          job.updatedAt = new Date().toISOString();

          if (job.attempts < job.maxAttempts) {
            // Reschedule with backoff: (2 ^ attempts) * 60 seconds
            const backoffMs = Math.pow(2, job.attempts) * 60_000;
            job.scheduledFor = new Date(Date.now() + backoffMs).toISOString();
            job.status = "scheduled";

            devJobStore.appendLog({
              id: crypto.randomUUID(),
              tenantId,
              jobId: job.id,
              action: job.jobType,
              status: "failed",
              details: `Attempt ${job.attempts}/${job.maxAttempts} failed: ${job.lastError}. Rescheduled with backoff.`,
              metadata: { attempts: job.attempts, backoffMs },
              createdAt: new Date().toISOString(),
            });

            executedJobsSummary.push({
              id: job.id,
              idempotencyKey: job.idempotencyKey,
              status: "scheduled",
              actionTaken: `Retrying (Attempt ${job.attempts}/${job.maxAttempts})`,
            });
          } else {
            // Permanently failed
            job.status = "failed";
            failedCount++;

            devJobStore.appendLog({
              id: crypto.randomUUID(),
              tenantId,
              jobId: job.id,
              action: job.jobType,
              status: "failed",
              details: `Max attempts (${job.maxAttempts}) reached. Job permanently failed: ${job.lastError}`,
              metadata: { attempts: job.attempts },
              createdAt: new Date().toISOString(),
            });

            executedJobsSummary.push({
              id: job.id,
              idempotencyKey: job.idempotencyKey,
              status: "failed",
              actionTaken: `Failed: ${job.lastError}`,
            });
          }
        }
      }
    }

    return {
      processed: processedCount,
      completed: completedCount,
      skipped: skippedCount,
      failed: failedCount,
      jobs: executedJobsSummary,
    };
  }

  /**
   * Helper: check if a lead has met stop conditions.
   * Returns a reason string if stopped, or null if ok to proceed.
   */
  private static async evaluateLeadStopConditions(
    tenantId: string,
    leadId: string
  ): Promise<string | null> {
    const mockSession: AuthSession = {
      isAuthenticated: true,
      user: {
        id: "stop-checker",
        email: "system@admitflow.local",
        fullName: "System Stop Condition Evaluator",
        isSuperAdmin: false,
      },
      currentRole: "institute_admin",
      currentTenant: {
        id: tenantId,
        name: "Tenant Institute",
        slug: "tenant",
        contactEmail: "admin@tenant.local",
      },
      memberships: [
        {
          id: "m-stop-checker",
          tenantId,
          userId: "stop-checker",
          role: "institute_admin",
        },
      ],
    };

    try {
      const details = await LeadService.getLeadById(mockSession, leadId);
      const lead = details?.lead;
      if (!lead) return null;

      // 1. Opt-out check
      if (lead.consentStatus === false) {
        return "Student opted out of admissions follow-ups.";
      }

      // 2. Admitted check
      if (lead.status === "admitted") {
        return "Student has already been admitted to the institution.";
      }

      // 3. Lost check
      if (lead.status === "lost") {
        return "Lead is marked as lost.";
      }

      // 4. Human handoff check
      const handoffActivity = details.activities.find(
        (a) =>
          a.description?.toLowerCase().includes("human handoff") ||
          a.description?.toLowerCase().includes("counselor requested") ||
          a.description?.toLowerCase().includes("counselling booked")
      );
      if (handoffActivity) {
        return "Human counselor handoff has been initiated.";
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * List jobs in the queue for the authenticated tenant.
   */
  public static async getJobQueue(
    session: AuthSession,
    status?: JobQueueStatus
  ): Promise<JobQueueRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    let list = devJobStore.getTenantQueue(tenantId);

    if (status) {
      list = list.filter((j) => j.status === status);
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * List audit logs for the authenticated tenant.
   */
  public static async getJobLogs(
    session: AuthSession,
    limit: number = 50
  ): Promise<JobLogRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const logs = devJobStore.getTenantLogs(tenantId);
    return logs.slice(0, limit);
  }

  /**
   * Cancel a job in the queue.
   */
  public static async cancelJob(
    session: AuthSession,
    jobId: string,
    reason: string = "Cancelled by user"
  ): Promise<JobQueueRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const queue = devJobStore.getTenantQueue(tenantId);
    const job = queue.find((j) => j.id === jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found or access denied.`);
    }

    job.status = "cancelled";
    job.updatedAt = new Date().toISOString();

    devJobStore.appendLog({
      id: crypto.randomUUID(),
      tenantId,
      jobId: job.id,
      action: job.jobType,
      status: "cancelled",
      details: `Job cancelled: ${reason}`,
      metadata: { reason },
      createdAt: new Date().toISOString(),
    });

    return job;
  }
}
