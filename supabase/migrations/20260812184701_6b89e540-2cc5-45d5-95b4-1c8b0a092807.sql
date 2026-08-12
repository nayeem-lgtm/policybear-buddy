ALTER TABLE public.telephony_settings
  ADD COLUMN IF NOT EXISTS default_queue_id TEXT,
  ADD COLUMN IF NOT EXISTS default_caller_id TEXT,
  ADD COLUMN IF NOT EXISTS default_caller_number TEXT;

ALTER TABLE public.telephony_agents
  ADD COLUMN IF NOT EXISTS extension TEXT;

INSERT INTO public.telephony_settings (provider)
SELECT 'calltools'
WHERE NOT EXISTS (SELECT 1 FROM public.telephony_settings WHERE provider = 'calltools');

UPDATE public.telephony_settings
SET connector_button_id = '27177',
    default_campaign_id = '86036',
    default_queue_id = '10051',
    default_caller_id = '728509',
    default_caller_number = '+17026288148',
    notes = COALESCE(notes, 'CRM Live Dial Button / Final Expense Inbound / FE Inbound Queue (ext 110) / Caller ID Agent'),
    updated_at = now()
WHERE provider = 'calltools';

CREATE UNIQUE INDEX IF NOT EXISTS telephony_agents_provider_agent_key
  ON public.telephony_agents (provider, provider_agent_id);

INSERT INTO public.telephony_agents (provider, provider_agent_id, provider_agent_name, provider_agent_email, extension)
VALUES ('calltools', '402349b3-a7bd-4dd7-ab50-2f7f572ded32', 'Test CRM', 'support@policybear.com', '987')
ON CONFLICT (provider, provider_agent_id) DO UPDATE
SET provider_agent_name = EXCLUDED.provider_agent_name,
    provider_agent_email = EXCLUDED.provider_agent_email,
    extension = EXCLUDED.extension;