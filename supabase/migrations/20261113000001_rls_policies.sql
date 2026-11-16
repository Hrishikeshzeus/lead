-- ==============================================================================
-- AdmitFlow Phase 2 Migration: Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable and force RLS on all multi-tenant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. Profiles Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR id IN (
      SELECT tm.user_id
      FROM public.tenant_members tm
      WHERE tm.tenant_id IN (
        SELECT my_tm.tenant_id
        FROM public.tenant_members my_tm
        WHERE my_tm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (
    -- Normal users cannot self-escalate to super_admin
    (id = auth.uid() AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 2. Tenants Policies (Institutes)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;
CREATE POLICY "tenants_select_policy" ON public.tenants
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(id)
  );

DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;
CREATE POLICY "tenants_insert_policy" ON public.tenants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "tenants_update_policy" ON public.tenants;
CREATE POLICY "tenants_update_policy" ON public.tenants
  FOR UPDATE
  USING (
    public.has_tenant_role(id, ARRAY['institute_admin'::app_role])
  )
  WITH CHECK (
    public.has_tenant_role(id, ARRAY['institute_admin'::app_role])
  );

DROP POLICY IF EXISTS "tenants_delete_policy" ON public.tenants;
CREATE POLICY "tenants_delete_policy" ON public.tenants
  FOR DELETE
  USING (
    public.has_tenant_role(id, ARRAY['institute_admin'::app_role])
  );

-- ------------------------------------------------------------------------------
-- 3. Tenant Members Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_members_select_policy" ON public.tenant_members;
CREATE POLICY "tenant_members_select_policy" ON public.tenant_members
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "tenant_members_insert_policy" ON public.tenant_members;
CREATE POLICY "tenant_members_insert_policy" ON public.tenant_members
  FOR INSERT
  WITH CHECK (
    public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role])
  );

DROP POLICY IF EXISTS "tenant_members_update_policy" ON public.tenant_members;
CREATE POLICY "tenant_members_update_policy" ON public.tenant_members
  FOR UPDATE
  USING (
    -- Only institute_admin can update, and users cannot modify their own role
    public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role])
    AND (user_id <> auth.uid() OR public.is_super_admin())
  )
  WITH CHECK (
    public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role])
    AND (user_id <> auth.uid() OR public.is_super_admin())
  );

DROP POLICY IF EXISTS "tenant_members_delete_policy" ON public.tenant_members;
CREATE POLICY "tenant_members_delete_policy" ON public.tenant_members
  FOR DELETE
  USING (
    public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role])
    AND (user_id <> auth.uid() OR public.is_super_admin())
  );

-- ------------------------------------------------------------------------------
-- 4. Leads Policies (Tenant Isolation)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;
CREATE POLICY "leads_select_policy" ON public.leads
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "leads_insert_policy" ON public.leads;
CREATE POLICY "leads_insert_policy" ON public.leads
  FOR INSERT
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;
CREATE POLICY "leads_update_policy" ON public.leads
  FOR UPDATE
  USING (
    public.user_belongs_to_tenant(tenant_id)
  )
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "leads_delete_policy" ON public.leads;
CREATE POLICY "leads_delete_policy" ON public.leads
  FOR DELETE
  USING (
    public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role])
  );
