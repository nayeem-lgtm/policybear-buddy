CREATE TABLE public.shift_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Los_Angeles')::date,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  auto_closed boolean NOT NULL DEFAULT false,
  current_status text NOT NULL DEFAULT 'Available',
  current_status_at timestamptz NOT NULL DEFAULT now(),
  available_seconds integer NOT NULL DEFAULT 0,
  on_call_seconds integer NOT NULL DEFAULT 0,
  break_seconds integer NOT NULL DEFAULT 0,
  lunch_seconds integer NOT NULL DEFAULT 0,
  meeting_seconds integer NOT NULL DEFAULT 0,
  training_seconds integer NOT NULL DEFAULT 0,
  unavailable_seconds integer NOT NULL DEFAULT 0,
  break_overrun_seconds integer NOT NULL DEFAULT 0,
  lunch_overrun_seconds integer NOT NULL DEFAULT 0,
  break_count integer NOT NULL DEFAULT 0,
  lunch_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date)
);

GRANT SELECT, INSERT, UPDATE ON public.shift_sessions TO authenticated;
GRANT ALL ON public.shift_sessions TO service_role;
ALTER TABLE public.shift_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shift sessions" ON public.shift_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_ops(auth.uid()));
CREATE POLICY "Users create own shift sessions" ON public.shift_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shift sessions" ON public.shift_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_ops(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_ops(auth.uid()));

CREATE TRIGGER shift_sessions_touch BEFORE UPDATE ON public.shift_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX shift_sessions_date_idx ON public.shift_sessions (work_date DESC);

CREATE TABLE public.shift_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.shift_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  detail text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  allowance_seconds integer,
  overrun_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.shift_status_events TO authenticated;
GRANT ALL ON public.shift_status_events TO service_role;
ALTER TABLE public.shift_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shift events" ON public.shift_status_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_ops(auth.uid()));
CREATE POLICY "Users create own shift events" ON public.shift_status_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shift events" ON public.shift_status_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_ops(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_ops(auth.uid()));

CREATE INDEX shift_status_events_session_idx ON public.shift_status_events (session_id, started_at);

CREATE OR REPLACE FUNCTION public.shift_close_stale_sessions(_max_hours integer DEFAULT 14)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE closed integer;
BEGIN
  UPDATE public.shift_status_events e
     SET ended_at = COALESCE(e.ended_at, s.current_status_at),
         duration_seconds = COALESCE(e.duration_seconds, 0)
    FROM public.shift_sessions s
   WHERE e.session_id = s.id
     AND e.ended_at IS NULL
     AND s.signed_out_at IS NULL
     AND s.signed_in_at < now() - make_interval(hours => _max_hours);

  UPDATE public.shift_sessions
     SET signed_out_at = current_status_at,
         current_status = 'Signed Out',
         auto_closed = true
   WHERE signed_out_at IS NULL
     AND signed_in_at < now() - make_interval(hours => _max_hours);

  GET DIAGNOSTICS closed = ROW_COUNT;
  RETURN closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_close_stale_sessions(integer) TO authenticated, service_role;