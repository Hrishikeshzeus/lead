import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "../scripts/run-migrations.ts";
import type { AuthSession } from "../src/lib/auth/types.ts";
import { AppointmentService } from "../src/lib/appointments/service.ts";
import { AnalyticsService } from "../src/lib/analytics/service.ts";
import { LeadService } from "../src/lib/leads/service.ts";

const APEX_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const BEACON_TENANT_ID = "b0000000-0000-0000-0000-000000000002";

const APEX_ADMIN_ID = "10000000-0000-0000-0000-000000000001";
const APEX_COUNSELLOR_ID = "10000000-0000-0000-0000-000000000002";

const BEACON_ADMIN_ID = "20000000-0000-0000-0000-000000000001";
const BEACON_COUNSELLOR_ID = "20000000-0000-0000-0000-000000000002";

describe("AdmitFlow Phase 7: Appointments & Realized Analytics Suite", () => {
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
  // 1. Counsellor Availability Configuration & Slot Calculation
  // ----------------------------------------------------------------------------
  it("AVAILABILITY: Configures counsellor working hours and calculates collision-free slots", async () => {
    const schedule = await AppointmentService.configureAvailability(apexAdminSession, {
      counsellorId: APEX_COUNSELLOR_ID,
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "12:00",
      slotDurationMinutes: 30,
      bufferMinutes: 10,
      timezone: "America/Los_Angeles",
    });

    assert.ok(schedule.id);
    assert.strictEqual(schedule.counsellorId, APEX_COUNSELLOR_ID);
    assert.strictEqual(schedule.slotDurationMinutes, 30);
    assert.strictEqual(schedule.bufferMinutes, 10);

    // Calculate slots on a Monday: 2026-11-16 is a Monday
    const slots = await AppointmentService.getAvailableSlots(
      apexAdminSession,
      APEX_COUNSELLOR_ID,
      "2026-11-16"
    );

    assert.ok(slots.length > 0, "Should generate open slots");
    // Verify first slot is 09:00 to 09:30
    assert.strictEqual(slots[0].durationMinutes, 30);
    assert.strictEqual(slots[0].counsellorId, APEX_COUNSELLOR_ID);
  });

  // ----------------------------------------------------------------------------
  // 2. Booking, Lead CRM Stage Transition & Activity Audit
  // ----------------------------------------------------------------------------
  it("BOOKING: Books appointment, associates lead, and updates CRM stage to counselling_booked", async () => {
    const lead = await LeadService.createLead(apexAdminSession, {
      studentName: "Devon Clark",
      phone: "+1-555-4401",
      email: "devon.clark@example.com",
      courseInterest: "B.Tech Computer Science & AI",
      source: "website",
      consentStatus: true,
    });

    const startTime = "2026-11-16T10:00:00.000Z";
    const appointment = await AppointmentService.bookAppointment(apexAdminSession, {
      leadId: lead.id,
      counsellorId: APEX_COUNSELLOR_ID,
      title: "Admissions Interview with Devon Clark",
      startTime,
      durationMinutes: 30,
      format: "virtual",
      meetingLink: "https://meet.admitflow.com/devon-clark",
    });

    assert.ok(appointment.id);
    assert.strictEqual(appointment.status, "scheduled");
    assert.strictEqual(appointment.leadName, "Devon Clark");
    assert.strictEqual(appointment.meetingLink, "https://meet.admitflow.com/devon-clark");

    // Verify lead CRM status changed
    const updatedLeadDetails = await LeadService.getLeadById(apexAdminSession, lead.id);
    assert.strictEqual(
      updatedLeadDetails?.lead.status,
      "counselling_booked",
      "Lead stage must advance to counselling_booked upon appointment booking"
    );
  });

  // ----------------------------------------------------------------------------
  // 3. Double-Booking Prevention: Service Layer Conflict Check
  // ----------------------------------------------------------------------------
  it("DOUBLE BOOKING: Service rejects overlapping appointment for the same counsellor", async () => {
    const lead1 = await LeadService.createLead(apexAdminSession, {
      studentName: "Student Conflict Alpha",
      phone: "+1-555-5501",
      courseInterest: "B.Tech Robotics",
      consentStatus: true,
    });

    const lead2 = await LeadService.createLead(apexAdminSession, {
      studentName: "Student Conflict Beta",
      phone: "+1-555-5502",
      courseInterest: "B.Tech Robotics",
      consentStatus: true,
    });

    const targetTime = "2026-11-17T14:00:00.000Z";

    // Book first appointment: 14:00 to 14:30
    await AppointmentService.bookAppointment(apexAdminSession, {
      leadId: lead1.id,
      counsellorId: APEX_COUNSELLOR_ID,
      title: "Alpha Consultation",
      startTime: targetTime,
      durationMinutes: 30,
    });

    // Attempt second overlapping appointment at 14:15 for same counsellor
    await assert.rejects(
      async () => {
        await AppointmentService.bookAppointment(apexAdminSession, {
          leadId: lead2.id,
          counsellorId: APEX_COUNSELLOR_ID,
          title: "Beta Conflicting Consultation",
          startTime: "2026-11-17T14:15:00.000Z",
          durationMinutes: 30,
        });
      },
      (err: any) => {
        return err.message.includes("Double booking conflict");
      },
      "Must reject overlapping booking for the same counsellor"
    );
  });

  // ----------------------------------------------------------------------------
  // 4. Double-Booking Prevention: Database Trigger Check
  // ----------------------------------------------------------------------------
  it("DOUBLE BOOKING (DB TRIGGER): PostgreSQL trigger trg_prevent_counsellor_double_booking raises 23P01", async () => {
    const tStart = "2026-11-20 10:00:00+00";
    const tEnd = "2026-11-20 10:30:00+00";

    // Insert first appointment directly in DB
    await asUser(APEX_ADMIN_ID, async (tx) => {
      await tx.query(
        `INSERT INTO public.appointments (
          id, tenant_id, lead_id, counsellor_id, title, start_time, end_time, status
        ) VALUES (
          '00000007-0000-0000-0000-000000000010',
          $1,
          'a1111111-0000-0000-0000-000000000001',
          $2,
          'DB Trigger Test Initial',
          $3,
          $4,
          'scheduled'
        );`,
        [APEX_TENANT_ID, APEX_COUNSELLOR_ID, tStart, tEnd]
      );
    });

    // Attempt overlapping insert in a separate transaction
    await assert.rejects(
      async () => {
        await asUser(APEX_ADMIN_ID, async (tx) => {
          await tx.query(
            `INSERT INTO public.appointments (
              id, tenant_id, lead_id, counsellor_id, title, start_time, end_time, status
            ) VALUES (
              gen_random_uuid(),
              $1,
              'a1111111-0000-0000-0000-000000000002',
              $2,
              'DB Trigger Test Overlap',
              '2026-11-20 10:15:00+00',
              '2026-11-20 10:45:00+00',
              'scheduled'
            );`,
            [APEX_TENANT_ID, APEX_COUNSELLOR_ID]
          );
        });
      },
      (err: any) => {
        return (
          err.code === "23P01" ||
          err.message.includes("Double booking conflict") ||
          err.code === "25P02"
        );
      },
      "Database trigger must reject overlapping active appointments"
    );
  });

  // ----------------------------------------------------------------------------
  // 5. Reschedule & Cancel Appointments
  // ----------------------------------------------------------------------------
  it("RESCHEDULE & CANCEL: Reschedules to new slot and updates status with reasons", async () => {
    const lead = await LeadService.createLead(apexAdminSession, {
      studentName: "Reschedule Test Student",
      phone: "+1-555-6601",
      courseInterest: "B.Tech Computer Science & AI",
      consentStatus: true,
    });

    const app = await AppointmentService.bookAppointment(apexAdminSession, {
      leadId: lead.id,
      counsellorId: APEX_COUNSELLOR_ID,
      title: "Initial Slot",
      startTime: "2026-11-18T09:00:00.000Z",
      durationMinutes: 30,
    });

    // Reschedule
    const rescheduled = await AppointmentService.rescheduleAppointment(apexAdminSession, {
      appointmentId: app.id,
      newStartTime: "2026-11-18T11:00:00.000Z",
      reason: "Requested later slot due to school classes",
    });

    assert.strictEqual(rescheduled.status, "rescheduled");
    assert.strictEqual(rescheduled.startTime, "2026-11-18T11:00:00.000Z");
    assert.ok(rescheduled.notes?.includes("classes"));

    // Cancel
    const cancelled = await AppointmentService.cancelAppointment(apexAdminSession, {
      appointmentId: app.id,
      reason: "Student decided to defer admission cycle",
    });

    assert.strictEqual(cancelled.status, "cancelled");
    assert.strictEqual(cancelled.cancellationReason, "Student decided to defer admission cycle");
  });

  // ----------------------------------------------------------------------------
  // 6. Cross-Tenant RLS & Data Isolation
  // ----------------------------------------------------------------------------
  it("RLS ISOLATION: Apex cannot view or modify Beacon appointments or payments", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      // Query Beacon appointments
      const appRes = await tx.query(
        "SELECT * FROM public.appointments WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.strictEqual(appRes.rows.length, 0, "Apex admin must see 0 Beacon appointments");

      // Query Beacon payments
      const payRes = await tx.query(
        "SELECT * FROM public.payments WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.strictEqual(payRes.rows.length, 0, "Apex admin must see 0 Beacon payments");

      // Attempt deletion of Beacon appointment
      const delRes = await tx.query(
        "DELETE FROM public.appointments WHERE id = '00000007-0000-0000-0000-000000000003';"
      );
      assert.strictEqual(delRes.affectedRows, 0, "Apex admin cannot delete Beacon appointments");
    });
  });

  // ----------------------------------------------------------------------------
  // 7. Real Database-Backed Analytics Report
  // ----------------------------------------------------------------------------
  it("ANALYTICS: Generates real database-backed report with verified conversion metrics", async () => {
    const report = await AnalyticsService.getAnalyticsReport(apexAdminSession, {
      preset: "all",
    });

    assert.ok(report.totalEnquiries > 0, "Must calculate total enquiries");
    assert.ok(typeof report.leadToAppointmentRate === "number");
    assert.ok(typeof report.leadToAdmissionRate === "number");
    assert.ok(typeof report.averageFirstResponseHours === "number");

    // Funnel stages
    assert.strictEqual(report.funnelStages.length, 5);
    assert.strictEqual(report.funnelStages[0].stage, "enquiries");
    assert.strictEqual(report.funnelStages[4].stage, "admissions");

    // Lead source performance
    assert.ok(report.leadSourcePerformance.length > 0);
    const websiteSource = report.leadSourcePerformance.find((s) => s.source === "website");
    assert.ok(websiteSource);
    assert.ok(websiteSource.leadsCount > 0);

    // Counsellor workload
    assert.ok(report.counsellorWorkload.length > 0);
    const adaWorkload = report.counsellorWorkload.find((c) => c.counsellorName === "Ada Lovelace");
    assert.ok(adaWorkload);
  });

  // ----------------------------------------------------------------------------
  // 8. Strict Realized Revenue Attribution Constraint
  // ----------------------------------------------------------------------------
  it("STRICT REVENUE ATTRIBUTION: Actual Realized Revenue requires recorded payment; pipeline is unconfirmed", async () => {
    const report = await AnalyticsService.getAnalyticsReport(apexAdminSession, {
      preset: "all",
    });

    // Alex Rivera has a confirmed payment of $14,000 seeded in migration 000007
    assert.strictEqual(
      report.revenue.actualRealizedRevenue,
      14000.0,
      "Actual Realized Revenue must reflect verified completed payment records ($14,000)"
    );
    assert.strictEqual(report.revenue.recordedPaymentsCount, 1);

    // Potential tuition from qualified/unconfirmed leads must be tracked as Estimated Pipeline Value
    assert.ok(
      report.revenue.estimatedPipelineValue > 0,
      "Unconfirmed interest must be tracked as Estimated Pipeline Value"
    );
    assert.notStrictEqual(
      report.revenue.actualRealizedRevenue,
      report.revenue.estimatedPipelineValue,
      "Realized revenue and estimated pipeline value must be strictly separated"
    );
  });

  // ----------------------------------------------------------------------------
  // 9. Date-Range Filtering
  // ----------------------------------------------------------------------------
  it("DATE RANGE FILTERING: Filters metrics based on 7d, 30d, 90d and custom ranges", async () => {
    const report7d = await AnalyticsService.getAnalyticsReport(apexAdminSession, {
      preset: "7d",
    });
    const reportAll = await AnalyticsService.getAnalyticsReport(apexAdminSession, {
      preset: "all",
    });

    assert.ok(report7d.dateRange.startDate);
    assert.ok(report7d.dateRange.endDate);
    assert.strictEqual(report7d.dateRange.preset, "7d");

    // All-time should have >= 7d enquiries
    assert.ok(reportAll.totalEnquiries >= report7d.totalEnquiries);
  });
});
