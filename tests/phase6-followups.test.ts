import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "../scripts/run-migrations.ts";
import type { AuthSession } from "../src/lib/auth/types.ts";
import { FollowUpService } from "../src/lib/followups/service.ts";
import { JobRunner } from "../src/lib/followups/job-runner.ts";
import { LeadService } from "../src/lib/leads/service.ts";

// Identifiers from seeds
const APEX_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const BEACON_TENANT_ID = "b0000000-0000-0000-0000-000000000002";

const APEX_ADMIN_ID = "10000000-0000-0000-0000-000000000001";
const APEX_COUNSELLOR_ID = "10000000-0000-0000-0000-000000000002";

const BEACON_ADMIN_ID = "20000000-0000-0000-0000-000000000001";
const BEACON_COUNSELLOR_ID = "20000000-0000-0000-0000-000000000002";

describe("AdmitFlow Phase 6: Follow-ups, Sequences, Lead Recovery & Job Queue", () => {
  let db: PGlite;

  const apexAdminSession: AuthSession = {
    isAuthenticated: true,
    user: {
      id: APEX_ADMIN_ID,
      email: "admin@apex.edu",
      fullName: "Dr. Alan Turing",
      isSuperAdmin: false,
    },
    currentRole: "institute_admin",
    currentTenant: {
      id: APEX_TENANT_ID,
      name: "Apex Institute of Technology",
      slug: "apex",
      contactEmail: "admin@apex.edu",
    },
    memberships: [
      {
        id: "m-apex-admin",
        tenantId: APEX_TENANT_ID,
        userId: APEX_ADMIN_ID,
        role: "institute_admin",
      },
    ],
  };

  const beaconAdminSession: AuthSession = {
    isAuthenticated: true,
    user: {
      id: BEACON_ADMIN_ID,
      email: "admin@beacon.edu",
      fullName: "Grace Hopper",
      isSuperAdmin: false,
    },
    currentRole: "institute_admin",
    currentTenant: {
      id: BEACON_TENANT_ID,
      name: "Beacon Academy",
      slug: "beacon",
      contactEmail: "admin@beacon.edu",
    },
    memberships: [
      {
        id: "m-beacon-admin",
        tenantId: BEACON_TENANT_ID,
        userId: BEACON_ADMIN_ID,
        role: "institute_admin",
      },
    ],
  };

  before(async () => {
    db = new PGlite();
    await runMigrations(db);
  });

  async function asUser<T = any>(
    userId: string | null,
    fn: (tx: any) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      if (userId) {
        await tx.exec("SET LOCAL ROLE authenticated;");
        await tx.query("SELECT set_config('request.jwt.claim.sub', $1, true);", [userId]);
      } else {
        await tx.exec("SET LOCAL ROLE anon;");
        await tx.query("SELECT set_config('request.jwt.claim.sub', '', true);");
      }
      return await fn(tx);
    });
  }

  // ----------------------------------------------------------------------------
  // 1. Database RLS & Multi-Tenant Isolation
  // ----------------------------------------------------------------------------
  it("RLS: Apex user cannot view or access Beacon follow-up sequences", async () => {
    // Insert a Beacon sequence as Beacon Admin
    await asUser(BEACON_ADMIN_ID, async (tx) => {
      await tx.query(
        `INSERT INTO public.followup_sequences (
          id, tenant_id, name, target_audience, is_active, steps
        ) VALUES (
          'f0000002-0000-0000-0000-000000000099',
          $1,
          'Beacon Special Re-engagement',
          'inactive_lead',
          true,
          '[]'::jsonb
        );`,
        [BEACON_TENANT_ID]
      );
    });

    // Attempt to query as Apex Admin
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const res = await tx.query(
        "SELECT * FROM public.followup_sequences WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.strictEqual(res.rows.length, 0, "Apex admin must see 0 Beacon sequences");
    });
  });

  it("RLS: Apex user cannot query or modify Beacon job queue or job logs", async () => {
    // Insert a Beacon job queue item
    await asUser(BEACON_ADMIN_ID, async (tx) => {
      await tx.query(
        `INSERT INTO public.job_queue (
          id, tenant_id, idempotency_key, job_type, scheduled_for, status
        ) VALUES (
          'b0000002-0000-0000-0000-000000000001',
          $1,
          'beacon-secret-key-1',
          'counsellor_reminder',
          now(),
          'scheduled'
        );`,
        [BEACON_TENANT_ID]
      );
    });

    // Attempt to query as Apex Admin
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const queueRes = await tx.query(
        "SELECT * FROM public.job_queue WHERE id = 'b0000002-0000-0000-0000-000000000001';"
      );
      assert.strictEqual(queueRes.rows.length, 0, "Apex user must not see Beacon jobs");

      // Attempt to delete Beacon job
      const delRes = await tx.query(
        "DELETE FROM public.job_queue WHERE id = 'b0000002-0000-0000-0000-000000000001';"
      );
      assert.strictEqual(delRes.affectedRows, 0, "Apex user must not be able to delete Beacon jobs");
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Idempotency & Duplicate Job Prevention
  // ----------------------------------------------------------------------------
  it("IDEMPOTENCY: DB rejects duplicate idempotency_key in job_queue", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      await tx.query(
        `INSERT INTO public.job_queue (
          id, tenant_id, idempotency_key, job_type, scheduled_for, status
        ) VALUES (
          'a0000001-0000-0000-0000-000000000099',
          $1,
          'idempotent-test-unique-key',
          'counsellor_reminder',
          now(),
          'scheduled'
        );`,
        [APEX_TENANT_ID]
      );
    });

    // Attempt second insert with identical key in a separate transaction
    await assert.rejects(
      async () => {
        await asUser(APEX_ADMIN_ID, async (tx) => {
          await tx.query(
            `INSERT INTO public.job_queue (
              id, tenant_id, idempotency_key, job_type, scheduled_for, status
            ) VALUES (
              gen_random_uuid(),
              $1,
              'idempotent-test-unique-key',
              'counsellor_reminder',
              now(),
              'scheduled'
            );`,
            [APEX_TENANT_ID]
          );
        });
      },
      (err: any) => {
        return err.message.includes("unique") || err.message.includes("duplicate") || err.code === "23505" || err.code === "25P02";
      },
      "Must reject duplicate idempotency_key"
    );
  });

  it("IDEMPOTENCY: JobRunner.enqueueJob returns existing job on duplicate key", async () => {
    const key = `test-idempotency-${Date.now()}`;

    const res1 = await JobRunner.enqueueJob(apexAdminSession, {
      idempotencyKey: key,
      jobType: "counsellor_reminder",
      payload: { step: 1, info: "First attempt" },
    });

    assert.strictEqual(res1.isDuplicate, false);
    assert.ok(res1.job.id);

    // Call again with same key
    const res2 = await JobRunner.enqueueJob(apexAdminSession, {
      idempotencyKey: key,
      jobType: "counsellor_reminder",
      payload: { step: 1, info: "Second attempt (should be ignored)" },
    });

    assert.strictEqual(res2.isDuplicate, true);
    assert.strictEqual(res2.job.id, res1.job.id, "Must return the exact same job ID");
  });

  // ----------------------------------------------------------------------------
  // 3. Task Creation, Dynamic Due/Overdue States & AI Draft Review
  // ----------------------------------------------------------------------------
  it("TASK STATES: Evaluates due vs overdue dynamically based on dueAt", async () => {
    // Create lead for this test
    const lead = await LeadService.createLead(apexAdminSession, {
      studentName: "Task State Student",
      phone: "+1-555-3344",
      email: "taskstudent@example.com",
      courseInterest: "B.Tech Computer Science & AI",
      consentStatus: true,
      source: "website",
    });

    const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour ahead

    const pastTask = await FollowUpService.createTask(apexAdminSession, {
      leadId: lead.id,
      title: "Overdue verification call",
      dueAt: pastTime,
      channel: "call",
      generateDraft: true,
    });

    const futureTask = await FollowUpService.createTask(apexAdminSession, {
      leadId: lead.id,
      title: "Upcoming campus visit prep",
      dueAt: futureTime,
      channel: "whatsapp",
      generateDraft: false,
    });

    // Check list
    const tasks = await FollowUpService.listTasks(apexAdminSession);
    const foundPast = tasks.find((t) => t.id === pastTask.id);
    const foundFuture = tasks.find((t) => t.id === futureTask.id);

    assert.ok(foundPast);
    assert.strictEqual(foundPast.status, "overdue", "Past task must evaluate to overdue");

    assert.ok(foundFuture);
    assert.strictEqual(foundFuture.status, "due", "Future task must evaluate to due");
  });

  it("AI DRAFT REVIEW: Human-in-the-loop review approves draft without sending automated message", async () => {
    // Create student lead
    const lead = await LeadService.createLead(apexAdminSession, {
      studentName: "Marcus Chen",
      phone: "+1-555-2202",
      email: "marcus.chen@example.com",
      courseInterest: "B.Tech Computer Science & AI",
      consentStatus: true,
      source: "website",
    });

    const task = await FollowUpService.createTask(apexAdminSession, {
      leadId: lead.id,
      title: "Draft review verification",
      dueAt: new Date(Date.now() + 7200000).toISOString(),
      channel: "call",
      generateDraft: true,
    });

    assert.strictEqual(task.aiDraftStatus, "pending_review");
    assert.ok(task.aiDraft.includes("Marcus Chen"));

    // Counsellor reviews and edits draft
    const updated = await FollowUpService.reviewAIDraft(apexAdminSession, {
      taskId: task.id,
      status: "approved",
      editedDraft: "Customized counselor opening: Welcome Marcus! We have saved your seat in the AI cohort.",
    });

    assert.strictEqual(updated.aiDraftStatus, "approved");
    assert.strictEqual(
      updated.aiDraft,
      "Customized counselor opening: Welcome Marcus! We have saved your seat in the AI cohort."
    );
    assert.strictEqual(updated.reviewedByName, "Dr. Alan Turing");
  });

  // ----------------------------------------------------------------------------
  // 4. Opt-Out Handling & Sequence Stop Conditions
  // ----------------------------------------------------------------------------
  it("SEQUENCE STOP: Stops sequence execution when student opts out", async () => {
    // 1. Create a lead with opt-out (consentStatus = false)
    const optOutLead = await LeadService.createLead(apexAdminSession, {
      studentName: "Dormant OptOut Student",
      phone: "+1-555-9999",
      email: "optout@example.com",
      courseInterest: "B.Tech Mechanical Engineering",
      consentStatus: false, // Opted out
      source: "website",
    });

    // 2. Attempting to enroll opted-out lead in sequence must fail immediately
    await assert.rejects(
      async () => {
        await JobRunner.enrollLeadInSequence(
          apexAdminSession,
          optOutLead.id,
          "f0000001-0000-0000-0000-000000000001"
        );
      },
      (err: any) => err.message.includes("opted out"),
      "Must refuse enrollment for opted-out leads"
    );

    // 3. If a scheduled job was pending and lead subsequently opts out, worker marks job skipped
    const key = `optout-job-${Date.now()}`;
    const { job } = await JobRunner.enqueueJob(apexAdminSession, {
      idempotencyKey: key,
      jobType: "counsellor_reminder",
      leadId: optOutLead.id,
      scheduledFor: new Date(Date.now() - 1000).toISOString(), // Due now
      payload: { templateTitle: "Should be skipped" },
    });

    const processResult = await JobRunner.processScheduledJobs(APEX_TENANT_ID);
    const skippedJob = processResult.jobs.find((j) => j.id === job.id);

    assert.ok(skippedJob, "Job should have been processed");
    assert.strictEqual(skippedJob.status, "skipped", "Must skip job when lead is opted out");
    assert.ok(skippedJob.actionTaken.toLowerCase().includes("opted out"));
  });

  it("SEQUENCE STOP: Cancels pending tasks when stopSequencesForLead is called", async () => {
    // Create an active lead and tasks
    const testLead = await LeadService.createLead(apexAdminSession, {
      studentName: "Admitted Student Test",
      phone: "+1-555-8888",
      email: "admitted@example.com",
      courseInterest: "B.Tech Computer Science & AI",
      consentStatus: true,
      source: "website",
    });

    const task1 = await FollowUpService.createTask(apexAdminSession, {
      leadId: testLead.id,
      title: "Pending sequence step 1",
      dueAt: new Date(Date.now() + 100000).toISOString(),
    });

    const task2 = await FollowUpService.createTask(apexAdminSession, {
      leadId: testLead.id,
      title: "Pending sequence step 2",
      dueAt: new Date(Date.now() + 200000).toISOString(),
    });

    assert.strictEqual(task1.status, "due");
    assert.strictEqual(task2.status, "due");

    // Student is admitted: trigger stop
    const cancelledCount = await FollowUpService.stopSequencesForLead(
      APEX_TENANT_ID,
      testLead.id,
      "Student admitted"
    );

    assert.strictEqual(cancelledCount, 2, "Both pending tasks must be cancelled");

    const tasksAfter = await FollowUpService.listTasks(apexAdminSession, {
      leadId: testLead.id,
    });
    tasksAfter.forEach((t) => {
      assert.strictEqual(t.status, "cancelled");
      assert.ok(t.cancelledReason?.includes("Student admitted"));
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Retries on Failure with Exponential Backoff
  // ----------------------------------------------------------------------------
  it("RETRIES & BACKOFF: Increments attempts and reschedules with backoff on failure", async () => {
    const failKey = `fail-retry-${Date.now()}`;
    const { job } = await JobRunner.enqueueJob(apexAdminSession, {
      idempotencyKey: failKey,
      jobType: "counsellor_reminder",
      scheduledFor: new Date(Date.now() - 5000).toISOString(), // Due now
      maxAttempts: 3,
      payload: {
        templateTitle: "Fail step",
        simulateFailure: true,
        errorMessage: "Simulated CRM gateway timeout",
      },
    });

    assert.strictEqual(job.attempts, 0);

    // Process jobs: first failure
    await JobRunner.processScheduledJobs(APEX_TENANT_ID);

    const queue1 = await JobRunner.getJobQueue(apexAdminSession);
    const updatedJob1 = queue1.find((j) => j.id === job.id);

    assert.ok(updatedJob1);
    assert.strictEqual(updatedJob1.attempts, 1, "Attempt must increment to 1");
    assert.strictEqual(updatedJob1.status, "scheduled", "Must remain scheduled for retry");
    assert.ok(new Date(updatedJob1.scheduledFor) > new Date(), "Must reschedule into the future");

    // Check audit log for retry entry
    const logs = await JobRunner.getJobLogs(apexAdminSession);
    const retryLog = logs.find((l) => l.jobId === job.id);
    assert.ok(retryLog);
    assert.strictEqual(retryLog.status, "failed");
    assert.ok(retryLog.details.includes("Attempt 1/3 failed"));
  });

  // ----------------------------------------------------------------------------
  // 6. Lead Recovery Detector
  // ----------------------------------------------------------------------------
  it("LEAD RECOVERY: Identifies dormant leads and suggests contextual re-engagement actions", async () => {
    const recoveryItems = await FollowUpService.getInactiveLeads(apexAdminSession, 2);

    assert.ok(Array.isArray(recoveryItems));
    // Verify structure
    if (recoveryItems.length > 0) {
      const item = recoveryItems[0];
      assert.ok(item.studentName);
      assert.ok(item.daysInactive >= 2);
      assert.ok(item.suggestedAction);
      assert.ok(typeof item.activeFollowupCount === "number");
    }
  });

  // ----------------------------------------------------------------------------
  // 7. Tenant Isolation in Services
  // ----------------------------------------------------------------------------
  it("SERVICE ISOLATION: Beacon cannot access Apex tasks or job queue records", async () => {
    const apexTasks = await FollowUpService.listTasks(apexAdminSession);
    const beaconTasks = await FollowUpService.listTasks(beaconAdminSession);

    // Beacon tasks should not contain Apex task IDs
    const apexTaskIds = new Set(apexTasks.map((t) => t.id));
    beaconTasks.forEach((bt) => {
      assert.strictEqual(
        apexTaskIds.has(bt.id),
        false,
        "Beacon must not see Apex tasks"
      );
    });

    const apexJobs = await JobRunner.getJobQueue(apexAdminSession);
    const beaconJobs = await JobRunner.getJobQueue(beaconAdminSession);

    const apexJobIds = new Set(apexJobs.map((j) => j.id));
    beaconJobs.forEach((bj) => {
      assert.strictEqual(
        apexJobIds.has(bj.id),
        false,
        "Beacon must not see Apex jobs"
      );
    });
  });
});
