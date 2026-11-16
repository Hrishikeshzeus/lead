-- ==============================================================================
-- AdmitFlow Phase 2 Migration: Multi-Tenant Architecture & Roles
-- ==============================================================================

-- 1. Create auth schema and roles (simulating Supabase Auth environment)
CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Helper to simulate or retrieve auth.uid()
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Define application roles enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('super_admin', 'institute_admin', 'counsellor');
  END IF;
END $$;

-- 3. Profiles table (links to Supabase auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tenants table (Educational Institutions)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- 5. Tenant Members table (Mapping users to institutes with roles)
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'counsellor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- 6. Tenant-Scoped Domain Table: Leads (Prospective Students)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  program_of_interest TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 50,
  assigned_counselor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ==============================================================================
-- Security Helper Functions (SECURITY DEFINER to avoid infinite recursion in RLS)
-- ==============================================================================

-- Check if current authenticated user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Check if current authenticated user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(check_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = check_tenant_id
      AND user_id = auth.uid()
  ) OR public.is_super_admin();
$$;

-- Check if current authenticated user has specific role in tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(check_tenant_id UUID, allowed_roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = check_tenant_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
  ) OR public.is_super_admin();
$$;

-- Atomic Onboarding Function: Creates institute and assigns owner as institute_admin
CREATE OR REPLACE FUNCTION public.create_institute_onboarding(
  inst_name TEXT,
  inst_slug TEXT,
  inst_email TEXT,
  inst_phone TEXT DEFAULT NULL,
  inst_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for institute onboarding';
  END IF;

  -- Ensure profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User profile not found. Complete profile creation first.';
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, contact_email, contact_phone, address, created_by)
  VALUES (inst_name, LOWER(TRIM(inst_slug)), inst_email, inst_phone, inst_address, v_user_id)
  RETURNING id INTO v_tenant_id;

  -- Assign creator as institute_admin
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'institute_admin'::app_role);

  RETURN v_tenant_id;
END;
$$;

-- Trigger to prevent users from altering their own role or tenant membership
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();

  -- If super_admin, permit alteration
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Block any user from modifying their own role
  IF OLD.user_id = v_current_user AND NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'Security violation: Users cannot alter their own membership role.';
  END IF;

  -- Block any user from modifying their own tenant association
  IF OLD.user_id = v_current_user AND NEW.tenant_id <> OLD.tenant_id THEN
    RAISE EXCEPTION 'Security violation: Users cannot transfer their own tenant membership.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.tenant_members;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.tenant_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();
