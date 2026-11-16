-- ==============================================================================
-- AdmitFlow Phase 3 Migration: Comprehensive Lead Management & Audit Trail
-- ==============================================================================

-- 1. Upgrade public.leads table with Phase 3 fields
DO $$
BEGIN
  -- student_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'student_name') THEN
    ALTER TABLE public.leads ADD COLUMN student_name TEXT;
    UPDATE public.leads SET student_name = full_name WHERE student_name IS NULL;
  END IF;

  -- course_interest
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'course_interest') THEN
    ALTER TABLE public.leads ADD COLUMN course_interest TEXT;
    UPDATE public.leads SET course_interest = program_of_interest WHERE course_interest IS NULL;
  END IF;

  -- target_exam
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'target_exam') THEN
    ALTER TABLE public.leads ADD COLUMN target_exam TEXT;
  END IF;

  -- preferred_batch
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'preferred_batch') THEN
    ALTER TABLE public.leads ADD COLUMN preferred_batch TEXT;
  END IF;

  -- source (TEXT with check)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'source') THEN
    ALTER TABLE public.leads ADD COLUMN source TEXT NOT NULL DEFAULT 'website';
  END IF;

  -- budget_range
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'budget_range') THEN
    ALTER TABLE public.leads ADD COLUMN budget_range TEXT;
  END IF;

  -- joining_timeline
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'joining_timeline') THEN
    ALTER TABLE public.leads ADD COLUMN joining_timeline TEXT;
  END IF;

  -- consent_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'consent_status') THEN
    ALTER TABLE public.leads ADD COLUMN consent_status BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- is_archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'is_archived') THEN
    ALTER TABLE public.leads ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- archived_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'archived_at') THEN
    ALTER TABLE public.leads ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
END $$;

-- Normalize any legacy/seed statuses to Phase 3 standard values before adding constraint
UPDATE public.leads
SET status = CASE
  WHEN status = 'counseling_scheduled' THEN 'counselling_booked'
  WHEN status = 'application_submitted' THEN 'qualified'
  WHEN status = 'enrolled' THEN 'admitted'
  WHEN status IN ('new', 'contacted', 'qualified', 'counselling_booked', 'admitted', 'lost') THEN status
  ELSE 'new'
END;

UPDATE public.leads
SET source = CASE
  WHEN source IN ('website', 'whatsapp', 'instagram', 'facebook', 'referral', 'phone', 'manual') THEN source
  ELSE 'website'
END;

-- Add check constraints for status and source
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE public.leads ADD CONSTRAINT valid_lead_status
  CHECK (status IN ('new', 'contacted', 'qualified', 'counselling_booked', 'admitted', 'lost'));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_lead_source;
ALTER TABLE public.leads ADD CONSTRAINT valid_lead_source
  CHECK (source IN ('website', 'whatsapp', 'instagram', 'facebook', 'referral', 'phone', 'manual'));

-- Synchronize student_name <-> full_name and course_interest <-> program_of_interest via trigger
CREATE OR REPLACE FUNCTION public.sync_lead_fields_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.student_name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.student_name := NEW.full_name;
  ELSIF NEW.full_name IS NULL AND NEW.student_name IS NOT NULL THEN
    NEW.full_name := NEW.student_name;
  END IF;

  IF NEW.course_interest IS NULL AND NEW.program_of_interest IS NOT NULL THEN
    NEW.course_interest := NEW.program_of_interest;
  ELSIF NEW.program_of_interest IS NULL AND NEW.course_interest IS NOT NULL THEN
    NEW.program_of_interest := NEW.course_interest;
  END IF;

  IF NEW.student_name IS NULL THEN
    NEW.student_name := 'Prospective Student';
    NEW.full_name := 'Prospective Student';
  END IF;

  IF NEW.course_interest IS NULL THEN
    NEW.course_interest := 'General Admissions';
    NEW.program_of_interest := 'General Admissions';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_fields_compat ON public.leads;
CREATE TRIGGER trg_sync_lead_fields_compat
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_fields_compat();

-- 2. Indexes for high-performance lead queries
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON public.leads(tenant_id, is_archived, status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_source ON public.leads(tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_counsellor ON public.leads(tenant_id, assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_email ON public.leads(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_phone ON public.leads(tenant_id, phone);

-- 3. Audit Trail Table: public.lead_activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON public.lead_activities(tenant_id);

-- 4. Row Level Security on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_activities_select_policy" ON public.lead_activities;
CREATE POLICY "lead_activities_select_policy" ON public.lead_activities
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "lead_activities_insert_policy" ON public.lead_activities;
CREATE POLICY "lead_activities_insert_policy" ON public.lead_activities
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "lead_activities_delete_policy" ON public.lead_activities;
CREATE POLICY "lead_activities_delete_policy" ON public.lead_activities
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Grant access to authenticated and anon
GRANT ALL ON TABLE public.lead_activities TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
