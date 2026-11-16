-- ==============================================================================
-- AdmitFlow Phase 6 Migration: Follow-ups, Sequences, Job Queue & Lead Recovery
-- ==============================================================================

-- 1. Follow-up Sequences Table
CREATE TABLE IF NOT EXISTS public.followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('new_lead', 'qualified_lead', 'inactive_lead', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stop_conditions TEXT[] NOT NULL DEFAULT '{"reply", "opt_out", "admitted", "lost", "handoff"}',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_seq_tenant ON public.followup_sequences(tenant_id, is_active);

-- 2. Follow-up Tasks Table
CREATE TABLE IF NOT EXISTS public.followup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.followup_sequences(id) ON DELETE SET NULL,
  sequence_step INTEGER DEFAULT 1,
  assigned_counsellor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'call' CHECK (channel IN ('call', 'whatsapp', 'email', 'in_person', 'task')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'overdue', 'completed', 'cancelled')),
  due_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  suggested_action TEXT DEFAULT '',
  ai_draft TEXT DEFAULT '',
  ai_draft_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (ai_draft_status IN ('pending_review', 'approved', 'rejected', 'sent', 'none')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_tasks_tenant_status ON public.followup_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_followup_tasks_lead ON public.followup_tasks(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_tasks_due ON public.followup_tasks(tenant_id, due_at ASC);

-- 3. Persistent Database Job Queue (Idempotent Worker Queue)
CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('schedule_followup', 'generate_ai_draft', 'counsellor_reminder', 'check_inactivity_recovery', 'stop_sequence')),
  task_id UUID REFERENCES public.followup_tasks(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'skipped', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled ON public.job_queue(status, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_job_queue_tenant ON public.job_queue(tenant_id, status);

-- 4. Job Logs Table
CREATE TABLE IF NOT EXISTS public.job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_queue(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.followup_tasks(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'sent', 'failed', 'skipped', 'cancelled')),
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_tenant ON public.job_logs(tenant_id, created_at DESC);

-- ==============================================================================
-- Row Level Security Policies
-- ==============================================================================

-- Follow-up Sequences RLS
ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_sequences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followup_seq_select_policy" ON public.followup_sequences;
CREATE POLICY "followup_seq_select_policy" ON public.followup_sequences
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "followup_seq_insert_policy" ON public.followup_sequences;
CREATE POLICY "followup_seq_insert_policy" ON public.followup_sequences
  FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "followup_seq_update_policy" ON public.followup_sequences;
CREATE POLICY "followup_seq_update_policy" ON public.followup_sequences
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "followup_seq_delete_policy" ON public.followup_sequences;
CREATE POLICY "followup_seq_delete_policy" ON public.followup_sequences
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Follow-up Tasks RLS
ALTER TABLE public.followup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followup_tasks_select_policy" ON public.followup_tasks;
CREATE POLICY "followup_tasks_select_policy" ON public.followup_tasks
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "followup_tasks_insert_policy" ON public.followup_tasks;
CREATE POLICY "followup_tasks_insert_policy" ON public.followup_tasks
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "followup_tasks_update_policy" ON public.followup_tasks;
CREATE POLICY "followup_tasks_update_policy" ON public.followup_tasks
  FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id))
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "followup_tasks_delete_policy" ON public.followup_tasks;
CREATE POLICY "followup_tasks_delete_policy" ON public.followup_tasks
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Job Queue & Logs RLS
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_queue_select_policy" ON public.job_queue;
CREATE POLICY "job_queue_select_policy" ON public.job_queue
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "job_queue_insert_policy" ON public.job_queue;
CREATE POLICY "job_queue_insert_policy" ON public.job_queue
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "job_queue_update_policy" ON public.job_queue;
CREATE POLICY "job_queue_update_policy" ON public.job_queue
  FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id))
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_logs_select_policy" ON public.job_logs;
CREATE POLICY "job_logs_select_policy" ON public.job_logs
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "job_logs_insert_policy" ON public.job_logs;
CREATE POLICY "job_logs_insert_policy" ON public.job_logs
  FOR INSERT
  WITH CHECK (true);

-- Permissions
GRANT ALL ON TABLE public.followup_sequences TO anon, authenticated;
GRANT ALL ON TABLE public.followup_tasks TO anon, authenticated;
GRANT ALL ON TABLE public.job_queue TO anon, authenticated;
GRANT ALL ON TABLE public.job_logs TO anon, authenticated;

-- ==============================================================================
-- Seed Data for Follow-up Sequences
-- ==============================================================================

-- Apex Institute Sequences
INSERT INTO public.followup_sequences (
  id,
  tenant_id,
  name,
  target_audience,
  is_active,
  stop_conditions,
  steps
) VALUES (
  'f0000001-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'New Applicant Fast Response Sequence',
  'new_lead',
  true,
  ARRAY['reply', 'opt_out', 'admitted', 'lost', 'handoff'],
  '[
    {
      "step_number": 1,
      "delay_hours": 2,
      "channel": "call",
      "action_type": "counsellor_reminder",
      "template_title": "Initial Welcome & Verification Call",
      "ai_prompt_instruction": "Generate a phone conversation opening verifying interest in B.Tech engineering and checking SAT or JEE readiness."
    },
    {
      "step_number": 2,
      "delay_hours": 24,
      "channel": "whatsapp",
      "action_type": "ai_draft_review",
      "template_title": "Curriculum & Batch Schedule Brochure",
      "ai_prompt_instruction": "Draft a personalized WhatsApp follow-up sharing the morning cohort schedule and research lab tour information."
    },
    {
      "step_number": 3,
      "delay_hours": 72,
      "channel": "email",
      "action_type": "counsellor_reminder",
      "template_title": "Merit Scholarship Deadline Reminder",
      "ai_prompt_instruction": "Highlight the Dean Merit Scholarship deadline of July 15 and invite questions on financial assistance."
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.followup_sequences (
  id,
  tenant_id,
  name,
  target_audience,
  is_active,
  stop_conditions,
  steps
) VALUES (
  'f0000001-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Inactive Lead Re-Engagement Sequence',
  'inactive_lead',
  true,
  ARRAY['reply', 'opt_out', 'admitted', 'lost', 'handoff'],
  '[
    {
      "step_number": 1,
      "delay_hours": 0,
      "channel": "whatsapp",
      "action_type": "ai_draft_review",
      "template_title": "Intake Seat Availability Check",
      "ai_prompt_instruction": "Draft a gentle check-in regarding remaining seats in the applicant preferred batch and asking if timeline changed."
    },
    {
      "step_number": 2,
      "delay_hours": 48,
      "channel": "call",
      "action_type": "counsellor_reminder",
      "template_title": "Personalized Academic Counseling Call",
      "ai_prompt_instruction": "Prepare speaking notes addressing any fee or schedule concerns and offering a 1-on-1 counselor appointment."
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Beacon Global University Sequences
INSERT INTO public.followup_sequences (
  id,
  tenant_id,
  name,
  target_audience,
  is_active,
  stop_conditions,
  steps
) VALUES (
  'f0000002-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'International Visa & Document Sequence',
  'qualified_lead',
  true,
  ARRAY['reply', 'opt_out', 'admitted', 'lost', 'handoff'],
  '[
    {
      "step_number": 1,
      "delay_hours": 6,
      "channel": "email",
      "action_type": "ai_draft_review",
      "template_title": "F-1 Visa Document Checklist",
      "ai_prompt_instruction": "Draft an email outlining passport validity and financial affidavit requirements for Beacon international programs."
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
