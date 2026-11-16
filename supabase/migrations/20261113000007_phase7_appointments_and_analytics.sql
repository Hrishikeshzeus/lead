-- ==============================================================================
-- AdmitFlow Phase 7 Migration: Appointments, Counsellor Availability & Analytics
-- ==============================================================================

-- 1. Counsellor Availability Table
CREATE TABLE IF NOT EXISTS public.counsellor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  counsellor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 10 CHECK (buffer_minutes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_counsellor_day UNIQUE (tenant_id, counsellor_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_counsellor_avail_tenant ON public.counsellor_availability(tenant_id, counsellor_id, is_active);

-- 2. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  counsellor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER NOT NULL DEFAULT 10,
  format TEXT NOT NULL DEFAULT 'virtual' CHECK (format IN ('virtual', 'in_person')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  meeting_link TEXT,
  location TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  rescheduled_from_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_counsellor_time ON public.appointments(tenant_id, counsellor_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON public.appointments(tenant_id, lead_id);

-- 3. Double Booking Prevention Trigger
CREATE OR REPLACE FUNCTION public.check_no_counsellor_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only prevent overlaps on active appointments ('scheduled' or 'confirmed')
  IF NEW.status IN ('scheduled', 'confirmed') THEN
    IF EXISTS (
      SELECT 1 FROM public.appointments
      WHERE counsellor_id = NEW.counsellor_id
        AND status IN ('scheduled', 'confirmed')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (start_time < NEW.end_time AND end_time > NEW.start_time)
    ) THEN
      RAISE EXCEPTION 'Double booking conflict: Counsellor is already booked for this time window.'
        USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_counsellor_double_booking ON public.appointments;
CREATE TRIGGER trg_prevent_counsellor_double_booking
  BEFORE INSERT OR UPDATE OF counsellor_id, start_time, end_time, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_no_counsellor_double_booking();

-- 4. Verified Admissions Payments Table (Strict Realized Revenue Tracking)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  transaction_reference TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_lead ON public.payments(tenant_id, lead_id, status);

-- ==============================================================================
-- Row Level Security Policies
-- ==============================================================================

-- Counsellor Availability RLS
ALTER TABLE public.counsellor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counsellor_availability FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "counsellor_avail_select_policy" ON public.counsellor_availability;
CREATE POLICY "counsellor_avail_select_policy" ON public.counsellor_availability
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "counsellor_avail_insert_policy" ON public.counsellor_availability;
CREATE POLICY "counsellor_avail_insert_policy" ON public.counsellor_availability
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "counsellor_avail_update_policy" ON public.counsellor_availability;
CREATE POLICY "counsellor_avail_update_policy" ON public.counsellor_availability
  FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id))
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "counsellor_avail_delete_policy" ON public.counsellor_availability;
CREATE POLICY "counsellor_avail_delete_policy" ON public.counsellor_availability
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Appointments RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
CREATE POLICY "appointments_select_policy" ON public.appointments
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
CREATE POLICY "appointments_insert_policy" ON public.appointments
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
CREATE POLICY "appointments_update_policy" ON public.appointments
  FOR UPDATE
  USING (public.user_belongs_to_tenant(tenant_id))
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
CREATE POLICY "appointments_delete_policy" ON public.appointments
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Permissions
GRANT ALL ON TABLE public.counsellor_availability TO anon, authenticated;
GRANT ALL ON TABLE public.appointments TO anon, authenticated;
GRANT ALL ON TABLE public.payments TO anon, authenticated;

-- ==============================================================================
-- Seed Data for Phase 7 (Appointments, Availability, and Verified Revenue)
-- ==============================================================================

-- 1. Availability for Ada Lovelace (Apex - 10000000-0000-0000-0000-000000000002)
-- Monday to Friday, 09:00 to 17:00, 30 min duration, 10 min buffer
INSERT INTO public.counsellor_availability (
  id, tenant_id, counsellor_id, day_of_week, start_time, end_time, slot_duration_minutes, buffer_minutes, timezone
) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1, '09:00:00', '17:00:00', 30, 10, 'America/Los_Angeles'),
  ('c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 2, '09:00:00', '17:00:00', 30, 10, 'America/Los_Angeles'),
  ('c0000001-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 3, '09:00:00', '17:00:00', 30, 10, 'America/Los_Angeles'),
  ('c0000001-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 4, '09:00:00', '17:00:00', 30, 10, 'America/Los_Angeles'),
  ('c0000001-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 5, '09:00:00', '17:00:00', 30, 10, 'America/Los_Angeles')
ON CONFLICT (tenant_id, counsellor_id, day_of_week) DO NOTHING;

-- 2. Availability for Claude Shannon (Beacon - 20000000-0000-0000-0000-000000000002)
-- Monday to Friday, 10:00 to 18:00, 45 min duration, 15 min buffer
INSERT INTO public.counsellor_availability (
  id, tenant_id, counsellor_id, day_of_week, start_time, end_time, slot_duration_minutes, buffer_minutes, timezone
) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, '10:00:00', '18:00:00', 45, 15, 'America/New_York'),
  ('c0000002-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 2, '10:00:00', '18:00:00', 45, 15, 'America/New_York'),
  ('c0000002-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 3, '10:00:00', '18:00:00', 45, 15, 'America/New_York'),
  ('c0000002-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 4, '10:00:00', '18:00:00', 45, 15, 'America/New_York'),
  ('c0000002-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 5, '10:00:00', '18:00:00', 45, 15, 'America/New_York')
ON CONFLICT (tenant_id, counsellor_id, day_of_week) DO NOTHING;

-- 3. Seed Appointments
-- Apex: Completed appointment with Alex Rivera (yesterday)
INSERT INTO public.appointments (
  id, tenant_id, lead_id, counsellor_id, title, description, start_time, end_time, duration_minutes, buffer_minutes, format, status, meeting_link, timezone
) VALUES (
  '00000007-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'B.Tech AI Admissions & Curriculum Evaluation',
  'Detailed portfolio review and scholarship consultation.',
  now() - INTERVAL '1 day',
  now() - INTERVAL '1 day' + INTERVAL '30 minutes',
  30,
  10,
  'virtual',
  'completed',
  'https://meet.admitflow.com/apex-alex-rivera',
  'America/Los_Angeles'
) ON CONFLICT (id) DO NOTHING;

-- Apex: Upcoming scheduled appointment with Samira Mehta (tomorrow at 14:00)
INSERT INTO public.appointments (
  id, tenant_id, lead_id, counsellor_id, title, description, start_time, end_time, duration_minutes, buffer_minutes, format, status, meeting_link, timezone
) VALUES (
  '00000007-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'M.Sc Cybersecurity Lab Tour & Batch Scheduling',
  'Discussion of morning vs weekend cohort schedules.',
  now() + INTERVAL '1 day',
  now() + INTERVAL '1 day' + INTERVAL '30 minutes',
  30,
  10,
  'in_person',
  'scheduled',
  NULL,
  'America/Los_Angeles'
) ON CONFLICT (id) DO NOTHING;

-- Beacon: Completed appointment with Chloe Vance (enrolled)
INSERT INTO public.appointments (
  id, tenant_id, lead_id, counsellor_id, title, description, start_time, end_time, duration_minutes, buffer_minutes, format, status, meeting_link, timezone
) VALUES (
  '00000007-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'M.Sc Financial Engineering Intake Interview',
  'Final enrollment document checklist and orientation overview.',
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days' + INTERVAL '45 minutes',
  45,
  15,
  'virtual',
  'completed',
  'https://meet.beacon.edu/chloe-vance',
  'America/New_York'
) ON CONFLICT (id) DO NOTHING;

-- 4. Seed Verified Payments (Recorded Admission Revenue)
-- Alex Rivera (Apex) verified deposit of $14,000 for B.Tech AI
INSERT INTO public.payments (
  id, tenant_id, lead_id, course_id, amount, currency, status, payment_method, transaction_reference, recorded_at
) VALUES (
  '00000007-0000-0000-0000-000000000051',
  'a0000000-0000-0000-0000-000000000001',
  'a1111111-0000-0000-0000-000000000001',
  'c1111111-0000-0000-0000-000000000001',
  14000.00,
  'USD',
  'completed',
  'bank_transfer',
  'TXN-APEX-2026-001',
  now() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Chloe Vance (Beacon) verified tuition payment of $12,500
INSERT INTO public.payments (
  id, tenant_id, lead_id, course_id, amount, currency, status, payment_method, transaction_reference, recorded_at
) VALUES (
  '00000007-0000-0000-0000-000000000052',
  'b0000000-0000-0000-0000-000000000002',
  'b2222222-0000-0000-0000-000000000002',
  'c2222222-0000-0000-0000-000000000001',
  12500.00,
  'USD',
  'completed',
  'credit_card',
  'TXN-BEACON-2026-002',
  now() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;
