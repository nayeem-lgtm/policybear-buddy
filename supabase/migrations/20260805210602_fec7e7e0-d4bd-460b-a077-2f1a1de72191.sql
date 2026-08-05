CREATE TABLE public.telephony_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_agent_id text NOT NULL,
  provider_agent_name text,
  provider_agent_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_agent_id)
);
GRANT SELECT ON public.telephony_agents TO authenticated;
GRANT ALL ON public.telephony_agents TO service_role;
ALTER TABLE public.telephony_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_agents_read_staff" ON public.telephony_agents FOR SELECT TO authenticated USING (public.is_ops(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "telephony_agents_admin_write" ON public.telephony_agents FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER telephony_agents_touch BEFORE UPDATE ON public.telephony_agents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.lead_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  first_touch_provider text,
  first_touch_at timestamptz,
  last_touch_provider text,
  last_touch_at timestamptz,
  inbound_callgrid_count integer NOT NULL DEFAULT 0,
  outbound_calltools_count integer NOT NULL DEFAULT 0,
  callback_via_calltools boolean NOT NULL DEFAULT false,
  total_attempts integer NOT NULL DEFAULT 0,
  total_talk_seconds integer NOT NULL DEFAULT 0,
  days_to_contact numeric,
  attributed_provider text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_journeys TO authenticated;
GRANT ALL ON public.lead_journeys TO service_role;
ALTER TABLE public.lead_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_journeys_read_staff" ON public.lead_journeys FOR SELECT TO authenticated USING (public.is_ops(auth.uid()) OR owner_id = auth.uid());
CREATE TRIGGER lead_journeys_touch BEFORE UPDATE ON public.lead_journeys FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.telephony_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_call_id text NOT NULL,
  journey_id uuid REFERENCES public.lead_journeys(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.telephony_agents(id) ON DELETE SET NULL,
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name text,
  direction text,
  from_number text,
  to_number text,
  lead_phone_e164 text,
  status text,
  disposition text,
  campaign text,
  buyer text,
  publisher text,
  state_code text,
  talk_seconds integer NOT NULL DEFAULT 0,
  revenue numeric,
  payout numeric,
  recording_url text,
  started_at timestamptz,
  ended_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_call_id)
);
CREATE INDEX telephony_calls_started_idx ON public.telephony_calls (started_at DESC);
CREATE INDEX telephony_calls_phone_idx ON public.telephony_calls (lead_phone_e164);
GRANT SELECT ON public.telephony_calls TO authenticated;
GRANT ALL ON public.telephony_calls TO service_role;
ALTER TABLE public.telephony_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telephony_calls_read_staff" ON public.telephony_calls FOR SELECT TO authenticated USING (public.is_ops(auth.uid()) OR agent_user_id = auth.uid());
CREATE TRIGGER telephony_calls_touch BEFORE UPDATE ON public.telephony_calls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.journey_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.lead_journeys(id) ON DELETE CASCADE,
  call_id uuid REFERENCES public.telephony_calls(id) ON DELETE CASCADE,
  provider text NOT NULL,
  direction text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  talk_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, call_id)
);
GRANT SELECT ON public.journey_touches TO authenticated;
GRANT ALL ON public.journey_touches TO service_role;
ALTER TABLE public.journey_touches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_touches_read_ops" ON public.journey_touches FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));

CREATE TABLE public.sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  resource text NOT NULL,
  cursor text,
  watermark timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  records_last_run integer NOT NULL DEFAULT 0,
  records_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, resource)
);
GRANT SELECT ON public.sync_state TO authenticated;
GRANT ALL ON public.sync_state TO service_role;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_state_read_ops" ON public.sync_state FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER sync_state_touch BEFORE UPDATE ON public.sync_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.attribution_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  provider text NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_overrides TO authenticated;
GRANT ALL ON public.attribution_overrides TO service_role;
ALTER TABLE public.attribution_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attribution_overrides_read_ops" ON public.attribution_overrides FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));
CREATE POLICY "attribution_overrides_admin_write" ON public.attribution_overrides FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER attribution_overrides_touch BEFORE UPDATE ON public.attribution_overrides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();