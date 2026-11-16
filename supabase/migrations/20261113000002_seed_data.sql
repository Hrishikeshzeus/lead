-- ==============================================================================
-- AdmitFlow Phase 2: Seed Data for Multi-Tenant Testing
-- Two Institutes with Separate Admins, Counsellors, and Leads
-- ==============================================================================

-- 1. Create Profiles
INSERT INTO public.profiles (id, full_name, email, is_super_admin) VALUES
  ('90000000-0000-0000-0000-000000000001', 'AdmitFlow System SuperAdmin', 'superadmin@admitflow.com', true),
  ('10000000-0000-0000-0000-000000000001', 'Dr. Alan Turing', 'admin@apex.edu', false),
  ('10000000-0000-0000-0000-000000000002', 'Ada Lovelace', 'counsellor@apex.edu', false),
  ('20000000-0000-0000-0000-000000000001', 'Dr. Grace Hopper', 'admin@beacon.edu', false),
  ('20000000-0000-0000-0000-000000000002', 'Claude Shannon', 'counsellor@beacon.edu', false)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  is_super_admin = EXCLUDED.is_super_admin;

-- 2. Create Two Separate Institutes (Tenants)
INSERT INTO public.tenants (id, name, slug, contact_email, contact_phone, address, created_by) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Apex Institute of Technology',
    'apex-tech',
    'admissions@apex.edu',
    '+1-555-0100',
    '100 Tech Boulevard, Boston, MA',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Beacon Global University',
    'beacon-univ',
    'admissions@beacon.edu',
    '+1-555-0200',
    '500 Horizon Avenue, San Francisco, CA',
    '20000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  contact_email = EXCLUDED.contact_email;

-- 3. Assign Members to Tenants with Specific Roles
INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES
  -- Apex Institute Members
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'institute_admin'::app_role),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'counsellor'::app_role),

  -- Beacon Global University Members
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'institute_admin'::app_role),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'counsellor'::app_role)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = EXCLUDED.role;

-- 4. Create Leads for Apex Institute
INSERT INTO public.leads (id, tenant_id, full_name, email, phone, program_of_interest, status, score, assigned_counselor_id) VALUES
  (
    'a1111111-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Alex Rivera',
    'alex.rivera@example.com',
    '+1-555-1101',
    'B.Tech AI & Robotics',
    'application_submitted',
    88,
    '10000000-0000-0000-0000-000000000002'
  ),
  (
    'a1111111-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Samira Mehta',
    'samira.mehta@example.com',
    '+1-555-1102',
    'M.Sc Cybersecurity',
    'counseling_scheduled',
    92,
    '10000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Create Leads for Beacon Global University
INSERT INTO public.leads (id, tenant_id, full_name, email, phone, program_of_interest, status, score, assigned_counselor_id) VALUES
  (
    'b2222222-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Liam Dubois',
    'liam.dubois@example.com',
    '+1-555-2201',
    'MBA International Trade',
    'new',
    75,
    '20000000-0000-0000-0000-000000000002'
  ),
  (
    'b2222222-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Chloe Vance',
    'chloe.vance@example.com',
    '+1-555-2202',
    'M.Sc Financial Engineering',
    'enrolled',
    99,
    '20000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;
