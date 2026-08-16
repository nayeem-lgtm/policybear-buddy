-- ============ business hours ============
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  schedule jsonb NOT NULL DEFAULT '{"mon":{"open":"07:00","close":"16:00"},"tue":{"open":"07:00","close":"16:00"},"wed":{"open":"07:00","close":"16:00"},"thu":{"open":"07:00","close":"16:00"},"fri":{"open":"07:00","close":"16:00"},"sat":null,"sun":null}'::jsonb,
  holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_hours TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_hours_read" ON public.business_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "business_hours_write" ON public.business_hours FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER business_hours_touch BEFORE UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ivr menus ============
CREATE TABLE public.ivr_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  greeting text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeout_seconds integer NOT NULL DEFAULT 8,
  invalid_message text NOT NULL DEFAULT 'Sorry, that is not a valid option.',
  max_retries integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ivr_menus TO authenticated;
GRANT ALL ON public.ivr_menus TO service_role;
ALTER TABLE public.ivr_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ivr_menus_read" ON public.ivr_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "ivr_menus_write" ON public.ivr_menus FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER ivr_menus_touch BEFORE UPDATE ON public.ivr_menus FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ call queues ============
CREATE TABLE public.call_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  strategy text NOT NULL DEFAULT 'longest_idle',
  priority integer NOT NULL DEFAULT 1,
  max_wait_seconds integer NOT NULL DEFAULT 300,
  wrap_seconds integer NOT NULL DEFAULT 20,
  ring_seconds integer NOT NULL DEFAULT 20,
  overflow_action text NOT NULL DEFAULT 'voicemail',
  overflow_target text,
  hold_music text,
  announce_position boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_queues TO authenticated;
GRANT ALL ON public.call_queues TO service_role;
ALTER TABLE public.call_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_queues_read" ON public.call_queues FOR SELECT TO authenticated USING (true);
CREATE POLICY "call_queues_write" ON public.call_queues FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER call_queues_touch BEFORE UPDATE ON public.call_queues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ queue members ============
CREATE TABLE public.queue_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.call_queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_priority integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (queue_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_members TO authenticated;
GRANT ALL ON public.queue_members TO service_role;
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_members_read" ON public.queue_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue_members_write" ON public.queue_members FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));

-- ============ phone numbers (DIDs) ============
CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  e164 text NOT NULL UNIQUE,
  label text NOT NULL,
  provider text NOT NULL DEFAULT 'calltools',
  country text NOT NULL DEFAULT 'US',
  kind text NOT NULL DEFAULT 'inbound',
  ivr_menu_id uuid REFERENCES public.ivr_menus(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  business_hours_id uuid REFERENCES public.business_hours(id) ON DELETE SET NULL,
  after_hours_action text NOT NULL DEFAULT 'voicemail',
  after_hours_target text,
  record_calls boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_numbers TO authenticated;
GRANT ALL ON public.phone_numbers TO service_role;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phone_numbers_read" ON public.phone_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "phone_numbers_write" ON public.phone_numbers FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER phone_numbers_touch BEFORE UPDATE ON public.phone_numbers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ dialer campaigns ============
CREATE TABLE public.dialer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'power',
  pacing numeric NOT NULL DEFAULT 1.0,
  caller_id text,
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  max_attempts integer NOT NULL DEFAULT 4,
  retry_minutes integer NOT NULL DEFAULT 120,
  calling_window_start text NOT NULL DEFAULT '08:00',
  calling_window_end text NOT NULL DEFAULT '19:00',
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dialer_campaigns TO authenticated;
GRANT ALL ON public.dialer_campaigns TO service_role;
ALTER TABLE public.dialer_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dialer_campaigns_read" ON public.dialer_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "dialer_campaigns_write" ON public.dialer_campaigns FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER dialer_campaigns_touch BEFORE UPDATE ON public.dialer_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ dial tasks ============
CREATE TABLE public.dial_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.dialer_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name text,
  phone_e164 text NOT NULL,
  state text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_outcome text,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dial_tasks_campaign_status_idx ON public.dial_tasks (campaign_id, status, next_attempt_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dial_tasks TO authenticated;
GRANT ALL ON public.dial_tasks TO service_role;
ALTER TABLE public.dial_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dial_tasks_read" ON public.dial_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "dial_tasks_agent_update" ON public.dial_tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.is_ops(auth.uid()))
  WITH CHECK (assigned_to = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "dial_tasks_ops_write" ON public.dial_tasks FOR INSERT TO authenticated WITH CHECK (public.is_ops(auth.uid()));
CREATE POLICY "dial_tasks_ops_delete" ON public.dial_tasks FOR DELETE TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER dial_tasks_touch BEFORE UPDATE ON public.dial_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ dialer calls ============
CREATE TABLE public.dialer_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL DEFAULT 'outbound',
  from_number text,
  to_number text,
  phone_e164 text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name text,
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.dialer_campaigns(id) ON DELETE SET NULL,
  dial_task_id uuid REFERENCES public.dial_tasks(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'queued',
  on_hold boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  wait_seconds integer NOT NULL DEFAULT 0,
  talk_seconds integer NOT NULL DEFAULT 0,
  hold_seconds integer NOT NULL DEFAULT 0,
  disposition text,
  notes text,
  recording_url text,
  provider text,
  provider_call_id text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dialer_calls_state_idx ON public.dialer_calls (state, queued_at DESC);
CREATE INDEX dialer_calls_agent_idx ON public.dialer_calls (agent_user_id, queued_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dialer_calls TO authenticated;
GRANT ALL ON public.dialer_calls TO service_role;
ALTER TABLE public.dialer_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dialer_calls_read" ON public.dialer_calls FOR SELECT TO authenticated
  USING (agent_user_id = auth.uid() OR agent_user_id IS NULL OR public.is_ops(auth.uid()));
CREATE POLICY "dialer_calls_insert" ON public.dialer_calls FOR INSERT TO authenticated
  WITH CHECK (agent_user_id = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "dialer_calls_update" ON public.dialer_calls FOR UPDATE TO authenticated
  USING (agent_user_id = auth.uid() OR agent_user_id IS NULL OR public.is_ops(auth.uid()))
  WITH CHECK (agent_user_id = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "dialer_calls_delete" ON public.dialer_calls FOR DELETE TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER dialer_calls_touch BEFORE UPDATE ON public.dialer_calls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ callbacks ============
CREATE TABLE public.callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name text,
  reason text NOT NULL DEFAULT 'Requested callback',
  detail text,
  source text NOT NULL DEFAULT 'agent',
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'Pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES public.call_queues(id) ON DELETE SET NULL,
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX callbacks_status_idx ON public.callbacks (status, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.callbacks TO authenticated;
GRANT ALL ON public.callbacks TO service_role;
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "callbacks_read" ON public.callbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "callbacks_insert" ON public.callbacks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "callbacks_update" ON public.callbacks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR assigned_to IS NULL OR public.is_ops(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid() OR assigned_to IS NULL OR public.is_ops(auth.uid()));
CREATE POLICY "callbacks_delete" ON public.callbacks FOR DELETE TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER callbacks_touch BEFORE UPDATE ON public.callbacks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();