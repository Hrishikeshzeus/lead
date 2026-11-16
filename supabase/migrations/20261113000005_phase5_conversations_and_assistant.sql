-- ==============================================================================
-- AdmitFlow Phase 5 Migration: Conversations, Assistant Configs & AI Usage Logs
-- ==============================================================================

-- 1. Assistant Configurations Table (Institute-Specific Settings)
CREATE TABLE IF NOT EXISTS public.assistant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  assistant_name TEXT NOT NULL DEFAULT 'AdmitFlow Assistant',
  persona_title TEXT NOT NULL DEFAULT 'Admissions Counselor',
  greeting_message TEXT NOT NULL DEFAULT 'Hi! I am the official AI Admissions Assistant for {institute_name}. How can I help you with courses, fees, or eligibility today?',
  custom_system_prompt TEXT DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'welcoming_professional',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  handoff_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.65,
  qualification_questions JSONB NOT NULL DEFAULT '["What academic program or target exam are you preparing for?", "When are you planning to start your studies?", "Do you prefer weekday morning or weekend batch schedules?"]'::jsonb,
  consent_disclaimer TEXT NOT NULL DEFAULT 'By sharing your contact details, you consent to receive admissions updates and counseling support from {institute_name}.',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_tone CHECK (tone IN ('welcoming_professional', 'academic_formal', 'encouraging_friendly'))
);

CREATE INDEX IF NOT EXISTS idx_assistant_configs_tenant ON public.assistant_configs(tenant_id);

-- 2. Conversations Table (Persistent Student Chat Sessions)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT,
  course_interest TEXT,
  target_exam TEXT,
  preferred_batch TEXT,
  joining_timeline TEXT,
  counselling_preference TEXT,
  objections JSONB DEFAULT '[]'::jsonb,
  summary TEXT DEFAULT '',
  qualification_stage TEXT NOT NULL DEFAULT 'greeting',
  handoff_reason TEXT,
  handoff_requested_at TIMESTAMPTZ,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_conversation_status CHECK (status IN ('active', 'counselor_handoff', 'completed', 'archived')),
  CONSTRAINT valid_qualification_stage CHECK (qualification_stage IN ('greeting', 'inquiry', 'qualifying', 'contact_capture', 'handoff_ready', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_session ON public.conversations(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON public.conversations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(tenant_id, lead_id);

-- 3. Conversation Messages Table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  citations JSONB DEFAULT '[]'::jsonb,
  model_used TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_sender_type CHECK (sender_type IN ('student', 'assistant', 'counsellor', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_created ON public.conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_tenant ON public.conversation_messages(tenant_id);

-- 4. AI Usage Logs Table (Usage, Latency & Error Tracking)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_ai_log_status CHECK (status IN ('success', 'error', 'fallback'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant ON public.ai_usage_logs(tenant_id, created_at DESC);

-- ==============================================================================
-- Row Level Security Policies
-- ==============================================================================

-- Assistant Configs RLS
ALTER TABLE public.assistant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_configs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assistant_configs_select_policy" ON public.assistant_configs;
CREATE POLICY "assistant_configs_select_policy" ON public.assistant_configs
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
    OR is_enabled = true -- public visitors can view active config
  );

DROP POLICY IF EXISTS "assistant_configs_update_policy" ON public.assistant_configs;
CREATE POLICY "assistant_configs_update_policy" ON public.assistant_configs
  FOR UPDATE
  USING (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

DROP POLICY IF EXISTS "assistant_configs_insert_policy" ON public.assistant_configs;
CREATE POLICY "assistant_configs_insert_policy" ON public.assistant_configs
  FOR INSERT
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['institute_admin'::app_role]));

-- Conversations RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy" ON public.conversations
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL -- allow visitor retrieval in public chat context
  );

DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
CREATE POLICY "conversations_insert_policy" ON public.conversations
  FOR INSERT
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL -- public visitor can initiate conversation
  );

DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
CREATE POLICY "conversations_update_policy" ON public.conversations
  FOR UPDATE
  USING (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL
  );

-- Conversation Messages RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_messages_select_policy" ON public.conversation_messages;
CREATE POLICY "conv_messages_select_policy" ON public.conversation_messages
  FOR SELECT
  USING (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "conv_messages_insert_policy" ON public.conversation_messages;
CREATE POLICY "conv_messages_insert_policy" ON public.conversation_messages
  FOR INSERT
  WITH CHECK (
    public.user_belongs_to_tenant(tenant_id)
    OR auth.uid() IS NULL
  );

-- AI Usage Logs RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_logs_select_policy" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_select_policy" ON public.ai_usage_logs
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS "ai_usage_logs_insert_policy" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_insert_policy" ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true); -- server-side logging always permitted

-- Permissions
GRANT ALL ON TABLE public.assistant_configs TO anon, authenticated;
GRANT ALL ON TABLE public.conversations TO anon, authenticated;
GRANT ALL ON TABLE public.conversation_messages TO anon, authenticated;
GRANT ALL ON TABLE public.ai_usage_logs TO anon, authenticated;

-- ==============================================================================
-- Seed Data for Assistant Configurations
-- ==============================================================================

-- Apex Institute Assistant Configuration
INSERT INTO public.assistant_configs (
  id,
  tenant_id,
  assistant_name,
  persona_title,
  greeting_message,
  custom_system_prompt,
  tone,
  is_enabled,
  handoff_threshold,
  qualification_questions,
  consent_disclaimer,
  rate_limit_per_minute
) VALUES (
  'cf111111-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Apex Admissions Advisor',
  'Lead Academic Admissions Counselor',
  'Welcome to Apex Institute of Technology! I can answer questions about our B.Tech and M.Tech engineering programs, curriculum, admissions criteria, and batch schedules. How can I assist you today?',
  'Apex Institute values rigorous engineering fundamentals and academic excellence. Emphasize research opportunities and industry partnerships when answering queries.',
  'welcoming_professional',
  true,
  0.65,
  '["What engineering discipline or entrance exam are you preparing for?", "When are you planning to begin your studies?", "Do you prefer weekday morning or weekend batch schedules?"]'::jsonb,
  'By sharing your contact details, you consent to receive official admissions updates and counseling assistance from Apex Institute of Technology.',
  15
) ON CONFLICT (tenant_id) DO UPDATE SET
  assistant_name = EXCLUDED.assistant_name,
  persona_title = EXCLUDED.persona_title,
  greeting_message = EXCLUDED.greeting_message;

-- Beacon Global University Assistant Configuration
INSERT INTO public.assistant_configs (
  id,
  tenant_id,
  assistant_name,
  persona_title,
  greeting_message,
  custom_system_prompt,
  tone,
  is_enabled,
  handoff_threshold,
  qualification_questions,
  consent_disclaimer,
  rate_limit_per_minute
) VALUES (
  'cf222222-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'Beacon Admissions Guide',
  'Global Academic Counselor',
  'Welcome to Beacon Global University! I am here to help you explore our international master''s degrees, visa documentation rules, and campus facilities. What program are you interested in?',
  'Beacon Global University emphasizes global mobility, diversity, and international accreditation. Ensure international applicants are informed about visa timelines.',
  'academic_formal',
  true,
  0.65,
  '["Which postgraduate program are you exploring?", "What is your target intake semester (Fall or Spring)?", "Do you require on-campus international student housing?"]'::jsonb,
  'By sharing your details, you agree to receive admissions guidance and compliance updates from Beacon Global University Admissions Office.',
  15
) ON CONFLICT (tenant_id) DO UPDATE SET
  assistant_name = EXCLUDED.assistant_name,
  persona_title = EXCLUDED.persona_title,
  greeting_message = EXCLUDED.greeting_message;
