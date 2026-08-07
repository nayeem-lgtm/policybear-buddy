CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('telephony-autosync') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telephony-autosync');
SELECT cron.schedule('telephony-autosync', '*/10 * * * *', $$
  SELECT net.http_post(
    url := 'https://project--3f3bb6d8-f7fd-4d13-a8ce-e43fd9db5f9d.lovable.app/api/public/hooks/telephony-sync',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_e6LQdno7V02tt5idRibXgA_By5uAn6z"}'::jsonb,
    body := '{"maxItems": 200}'::jsonb
  );
$$);