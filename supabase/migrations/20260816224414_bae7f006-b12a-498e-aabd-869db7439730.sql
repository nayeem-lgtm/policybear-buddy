CREATE TABLE public.dnc_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  contact_name text,
  reason text NOT NULL DEFAULT 'Consumer request',
  source text NOT NULL DEFAULT 'manual',
  scope text NOT NULL DEFAULT 'internal',
  notes text,
  active boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES auth.users(id),
  released_by uuid REFERENCES auth.users(id),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dnc_entries TO authenticated;
GRANT ALL ON public.dnc_entries TO service_role;
ALTER TABLE public.dnc_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dnc read" ON public.dnc_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "dnc insert" ON public.dnc_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dnc update" ON public.dnc_entries FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dnc delete ops" ON public.dnc_entries FOR DELETE TO authenticated USING (public.is_ops(auth.uid()));
CREATE TRIGGER dnc_entries_touch BEFORE UPDATE ON public.dnc_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX dnc_entries_active_idx ON public.dnc_entries (active, phone_e164);

CREATE TABLE public.dnc_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  action text NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'manual',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  entry_id uuid REFERENCES public.dnc_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dnc_events TO authenticated;
GRANT ALL ON public.dnc_events TO service_role;
ALTER TABLE public.dnc_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dnc events read" ON public.dnc_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "dnc events insert" ON public.dnc_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX dnc_events_created_idx ON public.dnc_events (created_at DESC);