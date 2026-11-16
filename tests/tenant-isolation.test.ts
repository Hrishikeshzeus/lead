import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "../scripts/run-migrations.ts";

// Seed Identifiers from 20261113000002_seed_data.sql
const APEX_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const BEACON_TENANT_ID = "b0000000-0000-0000-0000-000000000002";

const APEX_ADMIN_ID = "10000000-0000-0000-0000-000000000001";
const APEX_COUNSELLOR_ID = "10000000-0000-0000-0000-000000000002";

const BEACON_ADMIN_ID = "20000000-0000-0000-0000-000000000001";
const BEACON_COUNSELLOR_ID = "20000000-0000-0000-0000-000000000002";

const SUPER_ADMIN_ID = "90000000-0000-0000-0000-000000000001";

describe("AdmitFlow Phase 2: Multi-Tenant Isolation & Security Suite", () => {
  let db: PGlite;

  before(async () => {
    db = new PGlite();
    await runMigrations(db);
  });

  // Helper to execute query as a specific authenticated user
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
  // 1. Tenant Data Isolation Tests (Read)
  // ----------------------------------------------------------------------------
  it("Apex Admin can read Apex leads, but receives 0 rows when attempting to read Beacon leads", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const ownLeads = await tx.query(
        "SELECT * FROM public.leads WHERE tenant_id = $1;",
        [APEX_TENANT_ID]
      );
      assert.equal(ownLeads.rows.length, 2, "Apex admin should see both Apex leads");

      const otherLeads = await tx.query(
        "SELECT * FROM public.leads WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.equal(otherLeads.rows.length, 0, "Apex admin must NEVER read Beacon leads");

      const allAccessible = await tx.query("SELECT * FROM public.leads;");
      assert.equal(allAccessible.rows.length, 2, "Global SELECT must only return own tenant leads");
      for (const row of allAccessible.rows) {
        assert.equal(row.tenant_id, APEX_TENANT_ID);
      }
    });
  });

  it("Beacon Counsellor can read Beacon leads, but receives 0 rows when querying Apex leads", async () => {
    await asUser(BEACON_COUNSELLOR_ID, async (tx) => {
      const ownLeads = await tx.query(
        "SELECT * FROM public.leads WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.equal(ownLeads.rows.length, 2, "Beacon counsellor should see Beacon leads");

      const otherLeads = await tx.query(
        "SELECT * FROM public.leads WHERE tenant_id = $1;",
        [APEX_TENANT_ID]
      );
      assert.equal(otherLeads.rows.length, 0, "Beacon counsellor must NEVER read Apex leads");
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Tenant Data Isolation Tests (Update & Delete)
  // ----------------------------------------------------------------------------
  it("Apex Admin cannot modify or tamper with Beacon leads", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const updateResult = await tx.query(
        "UPDATE public.leads SET full_name = 'Compromised Name' WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.equal(updateResult.affectedRows, 0, "RLS must block updating another tenant's records");
    });

    const checkRes = await db.query(
      "SELECT full_name FROM public.leads WHERE id = 'b2222222-0000-0000-0000-000000000001';"
    );
    assert.equal(checkRes.rows[0].full_name, "Liam Dubois");
  });

  it("Apex Admin cannot delete Beacon leads", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      const deleteResult = await tx.query(
        "DELETE FROM public.leads WHERE tenant_id = $1;",
        [BEACON_TENANT_ID]
      );
      assert.equal(deleteResult.affectedRows, 0, "RLS must block deleting another tenant's records");
    });

    const checkRes = await db.query(
      "SELECT COUNT(*)::int as count FROM public.leads WHERE tenant_id = $1;",
      [BEACON_TENANT_ID]
    );
    assert.equal(checkRes.rows[0].count, 2);
  });

  it("Apex Admin cannot insert a lead with Beacon's tenant_id (prevents client-spoofed tenant_id)", async () => {
    await asUser(APEX_ADMIN_ID, async (tx) => {
      await tx.exec("SAVEPOINT sp_insert_lead;");
      let failed = false;
      try {
        await tx.query(
          `INSERT INTO public.leads (tenant_id, full_name, email, program_of_interest)
           VALUES ($1, 'Spoofed Student', 'spoofed@example.com', 'MBA');`,
          [BEACON_TENANT_ID]
        );
      } catch (err: any) {
        failed = true;
        assert.match(err.message, /violates row-level security policy/);
        await tx.exec("ROLLBACK TO sp_insert_lead;");
      }
      assert.ok(failed, "RLS policy must reject inserting data into a tenant where user lacks membership");
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Role Escalation & Self-Membership Tampering Tests (Requirement 7)
  // ----------------------------------------------------------------------------
  it("Counsellor cannot elevate their own role to institute_admin", async () => {
    await asUser(APEX_COUNSELLOR_ID, async (tx) => {
      const beforeRes = await tx.query(
        "SELECT role FROM public.tenant_members WHERE user_id = $1 AND tenant_id = $2;",
        [APEX_COUNSELLOR_ID, APEX_TENANT_ID]
      );
      assert.equal(beforeRes.rows[0].role, "counsellor");

      let failed = false;
      try {
        const updateRes = await tx.query(
          "UPDATE public.tenant_members SET role = 'institute_admin'::app_role WHERE user_id = $1 AND tenant_id = $2;",
          [APEX_COUNSELLOR_ID, APEX_TENANT_ID]
        );
        if (updateRes.affectedRows === 0) {
          failed = true;
        }
      } catch (err: any) {
        failed = true;
        assert.match(err.message, /violates row-level security policy|Security violation/);
      }

      assert.ok(failed, "Counsellor must NOT be able to change their own role");
    });

    const afterRes = await db.query(
      "SELECT role FROM public.tenant_members WHERE user_id = $1 AND tenant_id = $2;",
      [APEX_COUNSELLOR_ID, APEX_TENANT_ID]
    );
    assert.equal(afterRes.rows[0].role, "counsellor");
  });

  it("User cannot add themselves or another user to a different tenant", async () => {
    await asUser(APEX_COUNSELLOR_ID, async (tx) => {
      await tx.exec("SAVEPOINT sp_insert_member;");
      let failed = false;
      try {
        await tx.query(
          "INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES ($1, $2, 'institute_admin');",
          [BEACON_TENANT_ID, APEX_COUNSELLOR_ID]
        );
      } catch (err: any) {
        failed = true;
        assert.match(err.message, /violates row-level security policy/);
        await tx.exec("ROLLBACK TO sp_insert_member;");
      }
      assert.ok(failed, "User cannot insert themselves into an institute where they are not an admin");
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Institute Admin Legitimate Management
  // ----------------------------------------------------------------------------
  it("Apex Admin can add a new counsellor to Apex Institute", async () => {
    const NEW_USER_ID = "10000000-0000-0000-0000-000000000099";

    await db.query(
      "INSERT INTO public.profiles (id, full_name, email) VALUES ($1, 'New Counsellor', 'new.c@apex.edu') ON CONFLICT DO NOTHING;",
      [NEW_USER_ID]
    );

    await asUser(APEX_ADMIN_ID, async (tx) => {
      const res = await tx.query(
        "INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES ($1, $2, 'counsellor') RETURNING id;",
        [APEX_TENANT_ID, NEW_USER_ID]
      );
      assert.ok(res.rows[0].id, "Apex admin can successfully add a counsellor to Apex");
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Atomic Institute Onboarding (Requirement 2)
  // ----------------------------------------------------------------------------
  it("Authenticated user can onboard a new institute and is automatically granted institute_admin", async () => {
    const FOUNDER_USER_ID = "30000000-0000-0000-0000-000000000001";

    await db.query(
      "INSERT INTO public.profiles (id, full_name, email) VALUES ($1, 'Dean Cambridge', 'founder@cambridge-prep.edu') ON CONFLICT DO NOTHING;",
      [FOUNDER_USER_ID]
    );

    let newTenantId: string;
    await asUser(FOUNDER_USER_ID, async (tx) => {
      const result = await tx.query(
        "SELECT public.create_institute_onboarding($1, $2, $3, $4, $5) as tenant_id;",
        [
          "Cambridge Global Academy",
          "cambridge-global",
          "admissions@cambridge-prep.edu",
          "+1-555-9988",
          "42 Academic Way, Cambridge, MA",
        ]
      );
      newTenantId = result.rows[0].tenant_id;
      assert.ok(newTenantId, "New tenant ID must be returned");

      const memberRes = await tx.query(
        "SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2;",
        [newTenantId, FOUNDER_USER_ID]
      );
      assert.equal(memberRes.rows[0].role, "institute_admin");

      const leadRes = await tx.query(
        "INSERT INTO public.leads (tenant_id, full_name, email, program_of_interest) VALUES ($1, 'Jane Student', 'jane@example.com', 'IB Diploma') RETURNING id;",
        [newTenantId]
      );
      assert.ok(leadRes.rows[0].id, "Owner can insert leads into new institute");

      const crossLeads = await tx.query(
        "SELECT * FROM public.leads WHERE tenant_id = $1;",
        [APEX_TENANT_ID]
      );
      assert.equal(crossLeads.rows.length, 0, "New institute founder cannot view Apex leads");
    });
  });

  // ----------------------------------------------------------------------------
  // 6. Super Admin Auditing (Requirement 4)
  // ----------------------------------------------------------------------------
  it("Super Admin can view data across all institutes", async () => {
    await asUser(SUPER_ADMIN_ID, async (tx) => {
      const allTenants = await tx.query("SELECT * FROM public.tenants;");
      assert.ok(allTenants.rows.length >= 2, "Super Admin can view all institutes");

      const allLeads = await tx.query("SELECT * FROM public.leads;");
      assert.ok(allLeads.rows.length >= 4, "Super Admin can view leads across all institutes");
    });
  });

  // ----------------------------------------------------------------------------
  // 7. Unauthenticated User (Anonymity)
  // ----------------------------------------------------------------------------
  it("Unauthenticated visitor receives 0 rows on all protected multi-tenant tables", async () => {
    await asUser(null, async (tx) => {
      const leads = await tx.query("SELECT * FROM public.leads;");
      assert.equal(leads.rows.length, 0, "Unauthenticated user cannot read leads");

      const tenants = await tx.query("SELECT * FROM public.tenants;");
      assert.equal(tenants.rows.length, 0, "Unauthenticated user cannot read tenants");

      const members = await tx.query("SELECT * FROM public.tenant_members;");
      assert.equal(members.rows.length, 0, "Unauthenticated user cannot read members");
    });
  });
});
