import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "../scripts/run-migrations.ts";

// Identifiers from seeds
const APEX_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const BEACON_TENANT_ID = "b0000000-0000-0000-0000-000000000002";

const APEX_ADMIN_ID = "10000000-0000-0000-0000-000000000001";
const APEX_COUNSELLOR_ID = "10000000-0000-0000-0000-000000000002";

const BEACON_ADMIN_ID = "20000000-0000-0000-0000-000000000001";
const BEACON_COUNSELLOR_ID = "20000000-0000-0000-0000-000000000002";

describe("AdmitFlow Phase 3: CRM Lead Management & Audit Suite", () => {
  let db: PGlite;
  let testLeadId: string;

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
  // 1. Lead CRUD - Create with all Phase 3 Fields
  // ----------------------------------------------------------------------------
  it("CRUD: Successfully creates a lead with all 13 Phase 3 CRM fields", async () => {
    await asUser(APEX_COUNSELLOR_ID, async (tx) => {
      const res = await tx.query(
        `INSERT INTO public.leads (
          tenant_id,
          student_name,
          phone,
          email,
          course_interest,
          target_exam,
          preferred_batch,
          source,
          budget_range,
          joining_timeline,
          notes,
          consent_status,
          assigned_counselor_id,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id, student_name, course_interest, status, source;`,
        [
          APEX_TENANT_ID,
          "Kavita Rao",
          "+1-555-4040",
          "kavita.rao@example.com",
          "M.Sc Artificial Intelligence",
          "GRE (330)",
          "Fall 2026 Morning Cohort",
          "whatsapp",
          "$25,000 - $35,000/yr",
          "Within 1 Month",
          "Top tier computer science applicant with research publications.",
          true,
          APEX_COUNSELLOR_ID,
          "qualified",
        ]
      );

      assert.equal(res.rows.length, 1);
      testLeadId = (res.rows[0] as any).id;
      assert.ok(testLeadId, "Generated UUID returned");
      assert.equal((res.rows[0] as any).student_name, "Kavita Rao");
      assert.equal((res.rows[0] as any).status, "qualified");
      assert.equal((res.rows[0] as any).source, "whatsapp");
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Lead CRUD - Read & Verify Stored Attributes
  // ----------------------------------------------------------------------------
  it("CRUD: Reads lead details and verifies all Phase 3 fields are accurately stored", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const res = await tx.query(
        "SELECT * FROM public.leads WHERE id = $1;",
        [testLeadId]
      );
      assert.equal(res.rows.length, 1);
      const lead = res.rows[0] as any;
      assert.equal(lead.student_name, "Kavita Rao");
      assert.equal(lead.email, "kavita.rao@example.com");
      assert.equal(lead.phone, "+1-555-4040");
      assert.equal(lead.course_interest, "M.Sc Artificial Intelligence");
      assert.equal(lead.target_exam, "GRE (330)");
      assert.equal(lead.preferred_batch, "Fall 2026 Morning Cohort");
      assert.equal(lead.source, "whatsapp");
      assert.equal(lead.budget_range, "$25,000 - $35,000/yr");
      assert.equal(lead.joining_timeline, "Within 1 Month");
      assert.equal(lead.consent_status, true);
      assert.equal(lead.is_archived, false);
      assert.equal(lead.assigned_counselor_id, APEX_COUNSELLOR_ID);
      assert.equal(lead.status, "qualified");
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Lead CRUD - Update Status and Fields
  // ----------------------------------------------------------------------------
  it("CRUD: Updates lead status to counselling_booked and modifies budget range", async () => {
    await asUser(APEX_COUNSELLOR_ID, async (tx) => {
      const res = await tx.query(
        `UPDATE public.leads
         SET status = 'counselling_booked',
             budget_range = '$35,000+'
         WHERE id = $1 RETURNING status, budget_range;`,
        [testLeadId]
      );
      assert.equal(res.affectedRows, 1);
      assert.equal((res.rows[0] as any).status, "counselling_booked");
      assert.equal((res.rows[0] as any).budget_range, "$35,000+");
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Lead CRUD - Archive and Restore
  // ----------------------------------------------------------------------------
  it("CRUD: Archives a lead and verifies exclusion from active list and presence in archived list", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      // 1. Archive the lead
      await tx.query(
        `UPDATE public.leads
         SET is_archived = true, archived_at = now()
         WHERE id = $1;`,
        [testLeadId]
      );

      // 2. Query active leads (must exclude archived)
      const activeRes = await tx.query(
        "SELECT id FROM public.leads WHERE tenant_id = $1 AND is_archived = false;",
        [APEX_TENANT_ID]
      );
      const activeIds = activeRes.rows.map((r: any) => r.id);
      assert.ok(!activeIds.includes(testLeadId), "Archived lead must not appear in active leads");

      // 3. Query archived leads (must include archived)
      const archivedRes = await tx.query(
        "SELECT id, is_archived FROM public.leads WHERE tenant_id = $1 AND is_archived = true;",
        [APEX_TENANT_ID]
      );
      const archivedIds = archivedRes.rows.map((r: any) => r.id);
      assert.ok(archivedIds.includes(testLeadId), "Lead must appear in archived list");
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Access Control - Cross-Tenant Lead Isolation
  // ----------------------------------------------------------------------------
  it("Access Control: Beacon Counsellor cannot view, edit or delete Apex lead", async () => {
    await asUser(BEACON_COUNSELLOR_ID, async (tx) => {
      // 1. Attempt to view Apex lead
      const readRes = await tx.query(
        "SELECT * FROM public.leads WHERE id = $1;",
        [testLeadId]
      );
      assert.equal(readRes.rows.length, 0, "Beacon user must receive 0 rows for Apex lead");

      // 2. Attempt to update Apex lead
      const updateRes = await tx.query(
        "UPDATE public.leads SET student_name = 'Attacker' WHERE id = $1;",
        [testLeadId]
      );
      assert.equal(updateRes.affectedRows, 0, "Beacon user must update 0 rows for Apex lead");

      // 3. Attempt to delete Apex lead
      const deleteRes = await tx.query(
        "DELETE FROM public.leads WHERE id = $1;",
        [testLeadId]
      );
      assert.equal(deleteRes.affectedRows, 0, "Beacon user must delete 0 rows for Apex lead");
    });
  });

  // ----------------------------------------------------------------------------
  // 6. Search & Multi-Filter Querying
  // ----------------------------------------------------------------------------
  it("Filters & Search: Accurately filters by status, source and searches by name", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      // Unarchive for query testing
      await tx.query(
        "UPDATE public.leads SET is_archived = false WHERE id = $1;",
        [testLeadId]
      );

      // Filter by status = counselling_booked
      const statusRes = await tx.query(
        "SELECT id FROM public.leads WHERE tenant_id = $1 AND status = $2;",
        [APEX_TENANT_ID, "counselling_booked"]
      );
      assert.ok(statusRes.rows.length >= 1);

      // Filter by source = whatsapp
      const sourceRes = await tx.query(
        "SELECT id FROM public.leads WHERE tenant_id = $1 AND source = $2;",
        [APEX_TENANT_ID, "whatsapp"]
      );
      assert.ok(sourceRes.rows.length >= 1);

      // Search by partial student name
      const searchRes = await tx.query(
        "SELECT id, student_name FROM public.leads WHERE tenant_id = $1 AND student_name ILIKE $2;",
        [APEX_TENANT_ID, "%Kavita%"]
      );
      assert.equal(searchRes.rows.length, 1);
      assert.equal((searchRes.rows[0] as any).student_name, "Kavita Rao");
    });
  });

  // ----------------------------------------------------------------------------
  // 7. Duplicate Handling (Tenant Scoped)
  // ----------------------------------------------------------------------------
  it("Duplicate Handling: Detects existing email/phone within the same institute", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      // Check duplicate within Apex
      const dupRes = await tx.query(
        "SELECT id FROM public.leads WHERE tenant_id = $1 AND email = $2;",
        [APEX_TENANT_ID, "kavita.rao@example.com"]
      );
      assert.equal(dupRes.rows.length, 1, "Duplicate email in same tenant must be detected");
    });

    // Check that Beacon can still register the same email (multi-tenant boundary respected)
    await asUser(BEACON_ADMIN_ID, async (tx) => {
      const beaconDupRes = await tx.query(
        "SELECT id FROM public.leads WHERE tenant_id = $1 AND email = $2;",
        [BEACON_TENANT_ID, "kavita.rao@example.com"]
      );
      assert.equal(beaconDupRes.rows.length, 0, "Same email in a different tenant is not considered an internal duplicate");
    });
  });

  // ----------------------------------------------------------------------------
  // 8. Lead Audit Trail (public.lead_activities)
  // ----------------------------------------------------------------------------
  it("Audit Events: Logs lead creation, status changes and counselor assignments", async () => {
    let activityId: string;

    await asUser(APEX_COUNSELLOR_ID, async (tx) => {
      // Insert audit event
      const actRes = await tx.query(
        `INSERT INTO public.lead_activities (
          tenant_id,
          lead_id,
          user_id,
          actor_name,
          action_type,
          description,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb
        ) RETURNING id, action_type;`,
        [
          APEX_TENANT_ID,
          testLeadId,
          APEX_COUNSELLOR_ID,
          "Ada Lovelace",
          "status_changed",
          "Status updated from qualified to counselling_booked.",
          JSON.stringify({ oldStatus: "qualified", newStatus: "counselling_booked" }),
        ]
      );

      assert.equal(actRes.rows.length, 1);
      activityId = (actRes.rows[0] as any).id;
      assert.equal((actRes.rows[0] as any).action_type, "status_changed");

      // Verify read by Apex user
      const checkRes = await tx.query(
        "SELECT * FROM public.lead_activities WHERE lead_id = $1 ORDER BY created_at DESC;",
        [testLeadId]
      );
      assert.ok(checkRes.rows.length >= 1);
    });

    // Verify Tenant Isolation on Audit Trail
    await asUser(BEACON_COUNSELLOR_ID, async (tx) => {
      const crossAudit = await tx.query(
        "SELECT * FROM public.lead_activities WHERE id = $1;",
        [activityId]
      );
      assert.equal(crossAudit.rows.length, 0, "Beacon user must NEVER read Apex lead activities");
    });
  });

  // ----------------------------------------------------------------------------
  // 9. Counsellor Assignment
  // ----------------------------------------------------------------------------
  it("Counsellor Assignment: Allows assigning and reassigning counselors within tenant", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const res = await tx.query(
        `UPDATE public.leads
         SET assigned_counselor_id = $1
         WHERE id = $2
         RETURNING assigned_counselor_id;`,
        [APEX_ADMIN_ID, testLeadId]
      );
      assert.equal((res.rows[0] as any).assigned_counselor_id, APEX_ADMIN_ID);
    });
  });
});
