-- ============ ROLES & PROFILES ============
CREATE TYPE public.app_role AS ENUM ('CEO','Administrator','Operations','HR','Accounting','QC','Agent');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'Sales Floor',
  title text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  avatar_initials text NOT NULL DEFAULT '??',
  avatar_url text,
  phone text,
  presence text NOT NULL DEFAULT 'offline',
  landing text NOT NULL DEFAULT '/dashboard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('CEO','Administrator'))
$$;

CREATE OR REPLACE FUNCTION public.is_ops(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('CEO','Administrator','Operations'))
$$;

CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ MESSAGING ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'dm',
  name text NOT NULL DEFAULT '',
  topic text,
  avatar_initials text NOT NULL DEFAULT '??',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member',
  pinned boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

CREATE POLICY "conversations_read_members" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "conversations_update_members" ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_member(id, auth.uid())) WITH CHECK (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "conversations_delete_owner" ON public.conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "members_read" ON public.conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "members_insert" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );
CREATE POLICY "members_update_own" ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON public.conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'text',
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  attachment_size integer,
  call_direction text,
  call_duration text,
  call_missed boolean,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_members" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "messages_insert_members" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ IN-APP CALLS ============
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  initiator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'voice',
  scope text NOT NULL DEFAULT 'internal',
  status text NOT NULL DEFAULT 'ringing',
  external_number text,
  provider text,
  provider_call_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  recording_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  UNIQUE (call_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_participants TO authenticated;
GRANT ALL ON public.call_participants TO service_role;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_call_participant(_call_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.call_participants WHERE call_id = _call_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.call_sessions WHERE id = _call_id AND initiator_id = _user_id)
$$;

CREATE POLICY "calls_read" ON public.call_sessions FOR SELECT TO authenticated
  USING (initiator_id = auth.uid() OR public.is_call_participant(id, auth.uid()) OR public.is_ops(auth.uid()));
CREATE POLICY "calls_insert" ON public.call_sessions FOR INSERT TO authenticated
  WITH CHECK (initiator_id = auth.uid());
CREATE POLICY "calls_update" ON public.call_sessions FOR UPDATE TO authenticated
  USING (initiator_id = auth.uid() OR public.is_call_participant(id, auth.uid()))
  WITH CHECK (initiator_id = auth.uid() OR public.is_call_participant(id, auth.uid()));

CREATE POLICY "call_participants_read" ON public.call_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_call_participant(call_id, auth.uid()) OR public.is_ops(auth.uid()));
CREATE POLICY "call_participants_insert" ON public.call_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.call_sessions c WHERE c.id = call_id AND c.initiator_id = auth.uid()));
CREATE POLICY "call_participants_update" ON public.call_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ CONTACTS ============
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  state text,
  source text,
  status text NOT NULL DEFAULT 'New',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contacts_phone_idx ON public.contacts (phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_read" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_write" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER contacts_touch BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SMS / TEXTING ============
CREATE TABLE public.sms_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL,
  from_number text,
  provider text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text NOT NULL DEFAULT '',
  unread_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sms_threads_phone_idx ON public.sms_threads (contact_phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_threads TO authenticated;
GRANT ALL ON public.sms_threads TO service_role;
ALTER TABLE public.sms_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_threads_read" ON public.sms_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "sms_threads_write" ON public.sms_threads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.sms_threads(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  provider text,
  provider_message_id text,
  media_path text,
  error text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sms_messages_thread_idx ON public.sms_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_messages_read" ON public.sms_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "sms_messages_write" ON public.sms_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ COMPANY FEED ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'general',
  title text,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'post',
  pinned boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'company',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_read" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  mime text,
  size integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_attachments TO authenticated;
GRANT ALL ON public.post_attachments TO service_role;
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_attachments_read" ON public.post_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_attachments_write" ON public.post_attachments FOR ALL TO authenticated
  USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_comments_read" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "post_comments_update_own" ON public.post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "post_comments_delete_own" ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_likes_read" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_likes_write" ON public.post_likes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ INTEGRATIONS / API PLATFORM ============
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  direction text NOT NULL DEFAULT 'Inbound',
  status text NOT NULL DEFAULT 'Not Configured',
  enabled boolean NOT NULL DEFAULT false,
  base_url text,
  auth_type text NOT NULL DEFAULT 'api_key',
  secret_name text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_token text,
  last_sync_at timestamptz,
  last_error text,
  events_24h integer NOT NULL DEFAULT 0,
  errors_24h integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX integrations_provider_idx ON public.integrations (provider);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_read_ops" ON public.integrations FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));
CREATE POLICY "integrations_write_admin" ON public.integrations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER integrations_touch BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  provider text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  event_type text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX integration_events_created_idx ON public.integration_events (created_at DESC);
GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_events_read_ops" ON public.integration_events FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));

CREATE TABLE public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  event text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  secret_name text,
  last_fired_at timestamptz,
  failures integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_webhooks TO authenticated;
GRANT ALL ON public.outbound_webhooks TO service_role;
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outbound_webhooks_read_ops" ON public.outbound_webhooks FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));
CREATE POLICY "outbound_webhooks_write_admin" ON public.outbound_webhooks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_read_ops" ON public.api_keys FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));
CREATE POLICY "api_keys_write_admin" ON public.api_keys FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL DEFAULT 200,
  duration_ms integer,
  ip text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_log_created_idx ON public.api_request_log (created_at DESC);
GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_request_log_read_ops" ON public.api_request_log FOR SELECT TO authenticated USING (public.is_ops(auth.uid()));

-- ============ REALTIME ============
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.call_participants REPLICA IDENTITY FULL;
ALTER TABLE public.sms_messages REPLICA IDENTITY FULL;
ALTER TABLE public.sms_threads REPLICA IDENTITY FULL;
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;