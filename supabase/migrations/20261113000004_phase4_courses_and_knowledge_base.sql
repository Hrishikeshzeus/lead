-- ==============================================================================
-- AdmitFlow Phase 4 Migration: Courses, Knowledge Base & Full-Text Search
-- ==============================================================================

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  eligibility TEXT NOT NULL DEFAULT '',
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  fee_period TEXT NOT NULL DEFAULT 'annual',
  approved_fee_info TEXT NOT NULL DEFAULT '',
  batch_schedule TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  admission_availability TEXT NOT NULL DEFAULT 'open',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_admission_availability CHECK (admission_availability IN ('open', 'closing_soon', 'waitlist', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_courses_tenant_filter ON public.courses(tenant_id, is_archived, is_published);
CREATE INDEX IF NOT EXISTS idx_courses_exam_cat ON public.courses(tenant_id, exam_category);

-- 2. Knowledge Base Documents Table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  raw_content TEXT NOT NULL DEFAULT '',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_doc_type CHECK (document_type IN ('faq', 'pdf', 'docx', 'txt', 'markdown')),
  CONSTRAINT valid_doc_status CHECK (status IN ('draft', 'pending_approval', 'approved', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tenant ON public.knowledge_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_category ON public.knowledge_documents(tenant_id, category);

-- 3. Knowledge Chunks Table with Full-Text Search
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  tsv TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to automatically update tsvector on chunk insert or update
CREATE OR REPLACE FUNCTION public.sync_knowledge_chunk_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_knowledge_chunk_tsv ON public.knowledge_chunks;
CREATE TRIGGER trg_sync_knowledge_chunk_tsv
BEFORE INSERT OR UPDATE ON public.knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION public.sync_knowledge_chunk_tsv();

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tsv ON public.knowledge_chunks USING gin(tsv);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_lookup ON public.knowledge_chunks(tenant_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON public.knowledge_chunks(document_id);

-- 4. Row Level Security Policies

-- COURSES
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy" ON public.courses
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "courses_insert_policy" ON public.courses;
CREATE POLICY "courses_insert_policy" ON public.courses
  FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "courses_update_policy" ON public.courses;
CREATE POLICY "courses_update_policy" ON public.courses
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "courses_delete_policy" ON public.courses;
CREATE POLICY "courses_delete_policy" ON public.courses
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- KNOWLEDGE DOCUMENTS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_documents_select_policy" ON public.knowledge_documents;
CREATE POLICY "knowledge_documents_select_policy" ON public.knowledge_documents
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "knowledge_documents_insert_policy" ON public.knowledge_documents;
CREATE POLICY "knowledge_documents_insert_policy" ON public.knowledge_documents
  FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "knowledge_documents_update_policy" ON public.knowledge_documents;
CREATE POLICY "knowledge_documents_update_policy" ON public.knowledge_documents
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "knowledge_documents_delete_policy" ON public.knowledge_documents;
CREATE POLICY "knowledge_documents_delete_policy" ON public.knowledge_documents
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- KNOWLEDGE CHUNKS
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_chunks_select_policy" ON public.knowledge_chunks;
CREATE POLICY "knowledge_chunks_select_policy" ON public.knowledge_chunks
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "knowledge_chunks_insert_policy" ON public.knowledge_chunks;
CREATE POLICY "knowledge_chunks_insert_policy" ON public.knowledge_chunks
  FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "knowledge_chunks_update_policy" ON public.knowledge_chunks;
CREATE POLICY "knowledge_chunks_update_policy" ON public.knowledge_chunks
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "knowledge_chunks_delete_policy" ON public.knowledge_chunks;
CREATE POLICY "knowledge_chunks_delete_policy" ON public.knowledge_chunks
  FOR DELETE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Grant access to authenticated and anon
GRANT ALL ON TABLE public.courses TO anon, authenticated;
GRANT ALL ON TABLE public.knowledge_documents TO anon, authenticated;
GRANT ALL ON TABLE public.knowledge_chunks TO anon, authenticated;

-- 5. Seed Data for Apex Institute and Beacon University
-- Courses for Apex Institute
INSERT INTO public.courses (
  id, tenant_id, name, exam_category, description, eligibility,
  fee_currency, fee_amount, fee_period, approved_fee_info,
  batch_schedule, duration, location, admission_availability, is_published
) VALUES
  (
    'c1111111-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'B.Tech Artificial Intelligence & Robotics',
    'Undergraduate Engineering',
    'Premier four-year undergraduate engineering degree specializing in machine learning, autonomous systems, and computer vision.',
    'Minimum 70% in Grade 12 or equivalent with Physics, Mathematics, and Chemistry.',
    'USD',
    18500.00,
    'annual',
    'Tuition fee: $18,500/year. Lab and technology fees: $1,200/year. Merit scholarships available for top 10% applicants.',
    'Monday to Friday, 8:30 AM - 1:30 PM (Morning Cohort)',
    '4 Years (8 Semesters)',
    'Silicon Valley Main Campus',
    'open',
    true
  ),
  (
    'c1111111-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'M.Sc Applied Cybersecurity',
    'Postgraduate Technology',
    'Advanced cybersecurity curriculum covering ethical hacking, cloud security, cryptography, and defensive ops.',
    'Bachelor degree in Computer Science, IT, or related engineering discipline with minimum 3.0 GPA.',
    'USD',
    22000.00,
    'annual',
    'Tuition fee: $22,000/year. Industry certification exam vouchers included. No tuition waivers for evening batch.',
    'Tuesdays & Thursdays 6:00 PM - 9:30 PM + Alternate Saturdays',
    '2 Years (4 Semesters)',
    'Silicon Valley Main Campus & Online Hybrid',
    'closing_soon',
    true
  ),
  (
    'c1111111-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Quantum Computing Summer Intensive',
    'Professional Certificate',
    '8-week intensive workshop on Qiskit, quantum algorithms, and superconducting qubits.',
    'Prerequisite: Linear Algebra and Python proficiency.',
    'USD',
    3500.00,
    'one_time',
    'Flat registration fee: $3,500. Corporate group discounts of 15% for 3+ delegates.',
    'Saturdays 9:00 AM - 4:00 PM',
    '8 Weeks',
    'Online Virtual Classroom',
    'open',
    false -- Unpublished draft course
  )
ON CONFLICT (id) DO NOTHING;

-- Courses for Beacon Global University
INSERT INTO public.courses (
  id, tenant_id, name, exam_category, description, eligibility,
  fee_currency, fee_amount, fee_period, approved_fee_info,
  batch_schedule, duration, location, admission_availability, is_published
) VALUES
  (
    'c2222222-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'MBA International Trade & Global Logistics',
    'Graduate Business',
    'Dual-accredited MBA specializing in cross-border supply chains, trade finance, and geopolitical risk management.',
    'Undergraduate degree in any discipline with minimum 2 years of professional work experience.',
    'USD',
    26000.00,
    'annual',
    'Tuition fee: $26,000/year. Global study tour fee: $4,000. Need-based bursaries available up to $5,000.',
    'Monday to Thursday, 9:00 AM - 1:00 PM',
    '2 Years',
    'Beacon Downtown Campus',
    'open',
    true
  ),
  (
    'c2222222-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'M.Sc Financial Engineering & Quantitative Trading',
    'Quantitative Finance',
    'Rigorous quantitative finance program bridging stochastic calculus, algorithmic execution, and asset management.',
    'Strong mathematical background in Multivariable Calculus, Probability, and C++ / Python.',
    'USD',
    28000.00,
    'annual',
    'Tuition fee: $28,000/year. Bloomberg Terminal lab fee: $1,500/year. No fee waivers permitted.',
    'Weekend Cohort: Saturdays & Sundays 9:00 AM - 5:00 PM',
    '1.5 Years',
    'Beacon Financial District Center',
    'waitlist',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Knowledge Documents for Apex Institute
INSERT INTO public.knowledge_documents (
  id, tenant_id, title, document_type, category, status, raw_content, created_by, approved_at
) VALUES
  (
    'd1111111-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Scholarship & Financial Aid Policy 2026',
    'faq',
    'Financial Aid',
    'approved',
    'Apex Institute offers Dean Merit Scholarships covering up to 30% of annual tuition for incoming B.Tech students who achieved 90% or above in high school STEM subjects or top 500 in national entrance exams. Applications must be submitted by July 15. Financial aid is not applicable to certificate or executive evening courses.',
    '10000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd1111111-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Hostel Accommodation & Campus Residence Rules',
    'faq',
    'Campus Life',
    'approved',
    'On-campus residence is guaranteed for all first-year undergraduate students who apply before June 30. Single room fee is $4,800 per year, and twin-sharing is $3,200 per year, which includes high-speed Wi-Fi and 24/7 dining access.',
    '10000000-0000-0000-0000-000000000001',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Knowledge Chunks for Apex Institute
INSERT INTO public.knowledge_chunks (
  id, tenant_id, document_id, chunk_index, title, content, token_count, is_approved
) VALUES
  (
    'e1111111-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'd1111111-0000-0000-0000-000000000001',
    0,
    'Apex Dean Merit Scholarship Terms',
    'Apex Institute offers Dean Merit Scholarships covering up to 30% of annual tuition for incoming B.Tech students who achieved 90% or above in high school STEM subjects or top 500 in national entrance exams. Applications must be submitted by July 15. Financial aid is not applicable to certificate or executive evening courses.',
    65,
    true
  ),
  (
    'e1111111-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'd1111111-0000-0000-0000-000000000002',
    0,
    'Apex Campus Hostel Accommodation Fees',
    'On-campus residence is guaranteed for all first-year undergraduate students who apply before June 30. Single room fee is $4,800 per year, and twin-sharing is $3,200 per year, which includes high-speed Wi-Fi and 24/7 dining access.',
    48,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Knowledge Documents for Beacon Global University
INSERT INTO public.knowledge_documents (
  id, tenant_id, title, document_type, category, status, raw_content, created_by, approved_at
) VALUES
  (
    'd2222222-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'International Student Visa & English Proficiency Guidelines',
    'faq',
    'Admissions',
    'approved',
    'Beacon Global University requires all international applicants from non-English speaking jurisdictions to submit an official IELTS score of at least 6.5 (no band below 6.0) or TOEFL iBT score of at least 90. Student visa documentation support letters (I-20 equivalent) are issued within 10 business days after the initial deposit is confirmed.',
    '20000000-0000-0000-0000-000000000001',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Knowledge Chunks for Beacon Global University
INSERT INTO public.knowledge_chunks (
  id, tenant_id, document_id, chunk_index, title, content, token_count, is_approved
) VALUES
  (
    'e2222222-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'd2222222-0000-0000-0000-000000000001',
    0,
    'Beacon English Proficiency & Visa Requirements',
    'Beacon Global University requires all international applicants from non-English speaking jurisdictions to submit an official IELTS score of at least 6.5 (no band below 6.0) or TOEFL iBT score of at least 90. Student visa documentation support letters (I-20 equivalent) are issued within 10 business days after the initial deposit is confirmed.',
    60,
    true
  )
ON CONFLICT (id) DO NOTHING;
