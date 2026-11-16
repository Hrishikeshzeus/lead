export type AppRole = "super_admin" | "institute_admin" | "counsellor";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: AppRole;
  tenant?: Tenant;
  createdAt?: string;
}

export interface AuthSession {
  user: UserProfile | null;
  memberships: TenantMember[];
  currentTenant: Tenant | null;
  currentRole: AppRole | null;
  isAuthenticated: boolean;
}
