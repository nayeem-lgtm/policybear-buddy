-- 1. Settings (single control row)
CREATE TABLE public.telephony_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  writes_enabled boolean NOT NULL DEFAULT false,
  dial_enabled boolean NOT NULL DEFAULT false,
  status_sync_enabled boolean NOT NULL DEFAULT false,
  webhooks_enabled boolean NOT NULL DEFAULT false,
  connector_button_id text,
  webhook_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  default_campaign_id text,
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);
GRANT SELECT, INSERT, UPDATE ON public.telephony_settings TO authenticated;
GRANT ALL ON public.telephony_settings TO service_role;
ALTER TABLE public.telephony_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_settings_read" ON public.telephony_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "telephony_settings_write" ON public.telephony_settings
  FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER telephony_settings_touch BEFORE UPDATE ON public.telephony_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.telephony_settings (provider) VALUES ('calltools');

-- 2. Status map (CRM status -> provider status)
CREATE TABLE public.telephony_status_map (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  crm_status text NOT NULL,
  provider_status text NOT NULL,
  ready boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, crm_status)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telephony_status_map TO authenticated;
GRANT ALL ON public.telephony_status_map TO service_role;
ALTER TABLE public.telephony_status_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_status_map_read" ON public.telephony_status_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "telephony_status_map_write" ON public.telephony_status_map
  FOR ALL TO authenticated USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));
CREATE TRIGGER telephony_status_map_touch BEFORE UPDATE ON public.telephony_status_map
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.telephony_status_map (crm_status, provider_status, ready, sort_order) VALUES
  ('Available',   'READY',       true,  1),
  ('On Call',     'ON_CALL',     false, 2),
  ('Break',       'BREAK',       false, 3),
  ('Lunch',       'LUNCH',       false, 4),
  ('Meeting',     'MEETING',     false, 5),
  ('Training',    'TRAINING',    false, 6),
  ('Unavailable', 'NOT_READY',   false, 7),
  ('Signed Out',  'LOGGED_OUT',  false, 8);

-- 3. Dispositions synced from the provider
CREATE TABLE public.telephony_dispositions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  provider_disposition_id text NOT NULL,
  name text NOT NULL,
  category text,
  is_sale boolean NOT NULL DEFAULT false,
  is_callback boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_disposition_id)
);
GRANT SELECT ON public.telephony_dispositions TO authenticated;
GRANT ALL ON public.telephony_dispositions TO service_role;
ALTER TABLE public.telephony_dispositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_dispositions_read" ON public.telephony_dispositions
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER telephony_dispositions_touch BEFORE UPDATE ON public.telephony_dispositions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Agent work queue (callbacks / assigned work)
CREATE TABLE public.telephony_queue_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  provider_item_id text,
  kind text NOT NULL DEFAULT 'callback',
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name text,
  phone_e164 text,
  campaign text,
  scheduled_at timestamptz,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Open',
  attempts integer NOT NULL DEFAULT 0,
  notes text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_item_id)
);
CREATE INDEX telephony_queue_items_assigned_idx ON public.telephony_queue_items (assigned_user_id, status, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telephony_queue_items TO authenticated;
GRANT ALL ON public.telephony_queue_items TO service_role;
ALTER TABLE public.telephony_queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_queue_items_read" ON public.telephony_queue_items
  FOR SELECT TO authenticated
  USING (assigned_user_id = auth.uid() OR assigned_user_id IS NULL OR public.is_ops(auth.uid()));
CREATE POLICY "telephony_queue_items_update" ON public.telephony_queue_items
  FOR UPDATE TO authenticated
  USING (assigned_user_id = auth.uid() OR public.is_ops(auth.uid()))
  WITH CHECK (assigned_user_id = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "telephony_queue_items_insert" ON public.telephony_queue_items
  FOR INSERT TO authenticated WITH CHECK (public.is_ops(auth.uid()));
CREATE POLICY "telephony_queue_items_delete" ON public.telephony_queue_items
  FOR DELETE TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER telephony_queue_items_touch BEFORE UPDATE ON public.telephony_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Outbox: retrying queue of writes headed to the provider
CREATE TABLE public.telephony_outbox (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  action text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  path text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'Pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  response jsonb,
  response_status integer,
  target_ref text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX telephony_outbox_pending_idx ON public.telephony_outbox (status, next_attempt_at);
GRANT SELECT, INSERT, UPDATE ON public.telephony_outbox TO authenticated;
GRANT ALL ON public.telephony_outbox TO service_role;
ALTER TABLE public.telephony_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_outbox_read" ON public.telephony_outbox
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.is_ops(auth.uid()));
CREATE POLICY "telephony_outbox_manage" ON public.telephony_outbox
  FOR UPDATE TO authenticated
  USING (public.is_ops(auth.uid())) WITH CHECK (public.is_ops(auth.uid()));

-- 6. Action log: every provider request + response
CREATE TABLE public.telephony_action_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'calltools',
  action text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  request jsonb,
  response jsonb,
  response_status integer,
  ok boolean NOT NULL DEFAULT false,
  error text,
  duration_ms integer,
  outbox_id uuid REFERENCES public.telephony_outbox(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX telephony_action_log_created_idx ON public.telephony_action_log (created_at DESC);
GRANT SELECT ON public.telephony_action_log TO authenticated;
GRANT ALL ON public.telephony_action_log TO service_role;
ALTER TABLE public.telephony_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_action_log_read" ON public.telephony_action_log
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_ops(auth.uid()));

-- 7. Extra call fields
ALTER TABLE public.telephony_calls
  ADD COLUMN IF NOT EXISTS crm_originated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS script_name text,
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;