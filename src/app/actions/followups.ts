"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { FollowUpService } from "@/lib/followups/service";
import { JobRunner } from "@/lib/followups/job-runner";
import type {
  FollowUpTaskRecord,
  FollowUpSequenceRecord,
  CreateFollowUpTaskInput,
  FollowUpTaskFilterParams,
  InactiveLeadRecoveryItem,
  ReviewAIDraftInput,
  CreateSequenceInput,
  JobQueueRecord,
  JobLogRecord,
  JobQueueStatus,
} from "@/types/followup";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List follow-up tasks with dynamic state evaluation (due vs overdue).
 */
export async function getFollowUpTasksAction(
  params?: FollowUpTaskFilterParams
): Promise<ActionResult<FollowUpTaskRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const tasks = await FollowUpService.listTasks(session, params);
    return { success: true, data: tasks };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch follow-up tasks." };
  }
}

/**
 * Create a new follow-up task.
 */
export async function createFollowUpTaskAction(
  input: CreateFollowUpTaskInput
): Promise<ActionResult<FollowUpTaskRecord>> {
  try {
    const session = await getServerAuthSession();
    const task = await FollowUpService.createTask(session, input);
    return { success: true, data: task };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create follow-up task." };
  }
}

/**
 * Mark a follow-up task completed.
 */
export async function completeFollowUpTaskAction(
  taskId: string
): Promise<ActionResult<FollowUpTaskRecord>> {
  try {
    const session = await getServerAuthSession();
    const task = await FollowUpService.completeTask(session, taskId);
    return { success: true, data: task };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to complete follow-up task." };
  }
}

/**
 * Cancel a follow-up task with a cancellation reason.
 */
export async function cancelFollowUpTaskAction(
  taskId: string,
  reason: string
): Promise<ActionResult<FollowUpTaskRecord>> {
  try {
    const session = await getServerAuthSession();
    const task = await FollowUpService.cancelTask(session, taskId, reason);
    return { success: true, data: task };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel follow-up task." };
  }
}

/**
 * Review an AI-generated follow-up draft (approve, reject, or edit).
 */
export async function reviewAIDraftAction(
  input: ReviewAIDraftInput
): Promise<ActionResult<FollowUpTaskRecord>> {
  try {
    const session = await getServerAuthSession();
    const task = await FollowUpService.reviewAIDraft(session, input);
    return { success: true, data: task };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review AI draft." };
  }
}

/**
 * Get inactive leads for lead recovery with suggested next actions.
 */
export async function getInactiveLeadsAction(
  daysThreshold: number = 3
): Promise<ActionResult<InactiveLeadRecoveryItem[]>> {
  try {
    const session = await getServerAuthSession();
    const items = await FollowUpService.getInactiveLeads(session, daysThreshold);
    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch inactive leads." };
  }
}

/**
 * List follow-up sequence templates.
 */
export async function getFollowUpSequencesAction(): Promise<
  ActionResult<FollowUpSequenceRecord[]>
> {
  try {
    const session = await getServerAuthSession();
    const seqs = await FollowUpService.listSequences(session);
    return { success: true, data: seqs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch sequences." };
  }
}

/**
 * Create a new follow-up sequence template.
 */
export async function createFollowUpSequenceAction(
  input: CreateSequenceInput
): Promise<ActionResult<FollowUpSequenceRecord>> {
  try {
    const session = await getServerAuthSession();
    const seq = await FollowUpService.createSequence(session, input);
    return { success: true, data: seq };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create sequence." };
  }
}

/**
 * Toggle sequence active state.
 */
export async function toggleSequenceActiveAction(
  sequenceId: string,
  isActive: boolean
): Promise<ActionResult<FollowUpSequenceRecord>> {
  try {
    const session = await getServerAuthSession();
    const seq = await FollowUpService.toggleSequenceActive(session, sequenceId, isActive);
    return { success: true, data: seq };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update sequence." };
  }
}

/**
 * Enroll a lead into an automated follow-up sequence.
 * Schedules idempotent sequence step jobs into the persistent job queue.
 */
export async function enrollLeadInSequenceAction(
  leadId: string,
  sequenceId: string
): Promise<ActionResult<JobQueueRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const jobs = await JobRunner.enrollLeadInSequence(session, leadId, sequenceId);
    return { success: true, data: jobs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to enroll lead in sequence." };
  }
}

/**
 * Fetch persistent job queue records.
 */
export async function getJobQueueAction(
  status?: JobQueueStatus
): Promise<ActionResult<JobQueueRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const queue = await JobRunner.getJobQueue(session, status);
    return { success: true, data: queue };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch job queue." };
  }
}

/**
 * Fetch execution audit logs.
 */
export async function getJobLogsAction(
  limit: number = 50
): Promise<ActionResult<JobLogRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const logs = await JobRunner.getJobLogs(session, limit);
    return { success: true, data: logs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch job logs." };
  }
}

/**
 * Trigger manual execution of due scheduled jobs.
 */
export async function processScheduledJobsAction(): Promise<
  ActionResult<{
    processed: number;
    completed: number;
    skipped: number;
    failed: number;
  }>
> {
  try {
    const session = await getServerAuthSession();
    const tenantId =
      session.currentTenant?.id ||
      session.memberships?.[0]?.tenantId ||
      (session.user as any)?.tenantId;

    const result = await JobRunner.processScheduledJobs(tenantId);
    return {
      success: true,
      data: {
        processed: result.processed,
        completed: result.completed,
        skipped: result.skipped,
        failed: result.failed,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process scheduled jobs." };
  }
}

/**
 * Cancel a job in the queue.
 */
export async function cancelJobAction(
  jobId: string,
  reason: string = "Cancelled by user"
): Promise<ActionResult<JobQueueRecord>> {
  try {
    const session = await getServerAuthSession();
    const job = await JobRunner.cancelJob(session, jobId, reason);
    return { success: true, data: job };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel job." };
  }
}
