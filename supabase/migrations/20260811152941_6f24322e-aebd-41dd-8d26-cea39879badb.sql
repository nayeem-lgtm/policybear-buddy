ALTER TABLE public.telephony_agents
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_status_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS web_phone_status text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS telephony_outbox_pending_idx
  ON public.telephony_outbox (status, next_attempt_at);