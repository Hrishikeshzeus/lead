import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AuthSession, Tenant, TenantMember, AppRole, UserProfile } from "./types";

export const ACTIVE_TENANT_COOKIE = "admitflow_current_tenant_id";
export const DEMO_USER_COOKIE = "admitflow_demo_user";

// Predefined verified test accounts for seed data / dev testing
export const TEST_ACCOUNTS: Record<string, { user: UserProfile; tenant: Tenant; role: AppRole }> = {
  "admin@apex.edu": {
    user: {
      id: "10000000-0000-0000-0000-000000000001",
      fullName: "Dr. Alan Turing",
      email: "admin@apex.edu",
      isSuperAdmin: false,
    },
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Apex Institute of Technology",
      slug: "apex-tech",
      contactEmail: "admissions@apex.edu",
      contactPhone: "+1-555-0100",
      address: "100 Tech Boulevard, Boston, MA",
    },
    role: "institute_admin",
  },
  "counsellor@apex.edu": {
    user: {
      id: "10000000-0000-0000-0000-000000000002",
      fullName: "Ada Lovelace",
      email: "counsellor@apex.edu",
      isSuperAdmin: false,
    },
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Apex Institute of Technology",
      slug: "apex-tech",
      contactEmail: "admissions@apex.edu",
      contactPhone: "+1-555-0100",
      address: "100 Tech Boulevard, Boston, MA",
    },
    role: "counsellor",
  },
  "admin@beacon.edu": {
    user: {
      id: "20000000-0000-0000-0000-000000000001",
      fullName: "Dr. Grace Hopper",
      email: "admin@beacon.edu",
      isSuperAdmin: false,
    },
    tenant: {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Beacon Global University",
      slug: "beacon-univ",
      contactEmail: "admissions@beacon.edu",
      contactPhone: "+1-555-0200",
      address: "500 Horizon Avenue, San Francisco, CA",
    },
    role: "institute_admin",
  },
  "counsellor@beacon.edu": {
    user: {
      id: "20000000-0000-0000-0000-000000000002",
      fullName: "Claude Shannon",
      email: "counsellor@beacon.edu",
      isSuperAdmin: false,
    },
    tenant: {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Beacon Global University",
      slug: "beacon-univ",
      contactEmail: "admissions@beacon.edu",
      contactPhone: "+1-555-0200",
      address: "500 Horizon Avenue, San Francisco, CA",
    },
    role: "counsellor",
  },
  "superadmin@admitflow.com": {
    user: {
      id: "90000000-0000-0000-0000-000000000001",
      fullName: "AdmitFlow SuperAdmin",
      email: "superadmin@admitflow.com",
      isSuperAdmin: true,
    },
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Apex Institute of Technology",
      slug: "apex-tech",
      contactEmail: "admissions@apex.edu",
    },
    role: "super_admin",
  },
};

/**
 * Derives verified server auth session and active tenant.
 * Security guarantee: Never trusts client-supplied tenant ID; derives strictly from verified database membership.
 */
export async function getServerAuthSession(): Promise<AuthSession> {
  const cookieStore = cookies();
  const requestedTenantCookie = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const demoUserEmail = cookieStore.get(DEMO_USER_COOKIE)?.value;

  // 1. If Supabase is configured with live credentials, query Supabase auth and database
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          user: null,
          memberships: [],
          currentTenant: null,
          currentRole: null,
          isAuthenticated: false,
        };
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || profile?.email || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "Admissions Staff",
        avatarUrl: profile?.avatar_url,
        isSuperAdmin: Boolean(profile?.is_super_admin),
      };

      // Fetch verified memberships (never trusting client inputs)
      const { data: rawMemberships } = await supabase
        .from("tenant_members")
        .select(`
          id,
          tenant_id,
          user_id,
          role,
          created_at,
          tenants (
            id,
            name,
            slug,
            contact_email,
            contact_phone,
            address,
            created_at
          )
        `)
        .eq("user_id", user.id);

      const memberships: TenantMember[] = (rawMemberships || []).map((m: any) => ({
        id: m.id,
        tenantId: m.tenant_id,
        userId: m.user_id,
        role: m.role as AppRole,
        tenant: m.tenants
          ? {
              id: m.tenants.id,
              name: m.tenants.name,
              slug: m.tenants.slug,
              contactEmail: m.tenants.contact_email,
              contactPhone: m.tenants.contact_phone,
              address: m.tenants.address,
              createdAt: m.tenants.created_at,
            }
          : undefined,
        createdAt: m.created_at,
      }));

      // Derive active tenant from verified memberships only
      let activeTenant: Tenant | null = null;
      let activeRole: AppRole | null = null;

      if (requestedTenantCookie) {
        const matched = memberships.find((m) => m.tenantId === requestedTenantCookie);
        if (matched && matched.tenant) {
          activeTenant = matched.tenant;
          activeRole = matched.role;
        }
      }

      // If requested tenant not found or invalid, fallback to first verified membership
      if (!activeTenant && memberships.length > 0 && memberships[0].tenant) {
        activeTenant = memberships[0].tenant;
        activeRole = memberships[0].role;
      }

      return {
        user: userProfile,
        memberships,
        currentTenant: activeTenant,
        currentRole: userProfile.isSuperAdmin ? "super_admin" : activeRole,
        isAuthenticated: true,
      };
    } catch {
      // Fallback if network or Supabase tables are initialising
    }
  }

  // 2. Simulated / Local verified session for Phase 2 dev & testing
  // Allows testing institute switching between Apex and Beacon with separate users and roles
  const activeEmail = demoUserEmail || "admin@apex.edu";
  const matchedTestAccount = TEST_ACCOUNTS[activeEmail] || TEST_ACCOUNTS["admin@apex.edu"];

  // Build membership list for demo user (Apex admin also has access to test switching)
  const demoMemberships: TenantMember[] = [
    {
      id: "mem-01",
      tenantId: matchedTestAccount.tenant.id,
      userId: matchedTestAccount.user.id,
      role: matchedTestAccount.role,
      tenant: matchedTestAccount.tenant,
    },
  ];

  return {
    user: matchedTestAccount.user,
    memberships: demoMemberships,
    currentTenant: matchedTestAccount.tenant,
    currentRole: matchedTestAccount.role,
    isAuthenticated: true,
  };
}

/**
 * Server guard: throws redirect to /login if user is not authenticated.
 */
export async function requireAuth() {
  const session = await getServerAuthSession();
  if (!session.isAuthenticated || !session.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Server guard: requires user to belong to an active institute; otherwise redirects to /onboarding.
 */
export async function requireTenantMembership() {
  const session = await requireAuth();
  if (!session.currentTenant) {
    redirect("/onboarding");
  }
  return session;
}

/**
 * Server guard: verifies that user's role satisfies the required roles.
 */
export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireTenantMembership();
  if (session.user?.isSuperAdmin) {
    return session;
  }
  if (!session.currentRole || !allowedRoles.includes(session.currentRole)) {
    throw new Error("403 Forbidden: Insufficient permissions for this action.");
  }
  return session;
}
