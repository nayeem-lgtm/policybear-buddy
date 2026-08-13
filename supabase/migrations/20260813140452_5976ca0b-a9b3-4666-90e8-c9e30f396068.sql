-- ============ helper functions ============
CREATE OR REPLACE FUNCTION public.has_sales_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('CEO','Administrator','Operations','QC','Agent')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    LEFT JOIN public.profiles pr ON pr.id = _user_id
    WHERE p.id = _post_id
      AND (
        p.author_id = _user_id
        OR public.is_admin(_user_id)
        OR lower(p.audience) IN ('all','everyone','company')
        OR lower(p.audience) = lower(coalesce(pr.department, ''))
        OR lower(p.audience) = lower(coalesce(pr.team, ''))
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id AND lower(ur.role::text) = lower(p.audience)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_attachment(_path text, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_members cm
      ON cm.conversation_id = m.conversation_id AND cm.user_id = _user_id
    WHERE m.attachment_path = _path
  )
  OR EXISTS (
    SELECT 1 FROM public.post_attachments pa
    WHERE pa.path = _path
      AND (pa.uploaded_by = _user_id OR public.can_view_post(pa.post_id, _user_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.sms_messages sm
    JOIN public.sms_threads st ON st.id = sm.thread_id
    WHERE sm.media_path = _path
      AND (st.assigned_to = _user_id OR public.is_ops(_user_id))
  )
$$;

-- ============ contacts ============
DROP POLICY IF EXISTS contacts_read ON public.contacts;
DROP POLICY IF EXISTS contacts_write ON public.contacts;

CREATE POLICY contacts_read ON public.contacts FOR SELECT TO authenticated
USING (
  public.is_ops(auth.uid())
  OR owner_id = auth.uid()
  OR (owner_id IS NULL AND public.has_sales_access(auth.uid()))
);

CREATE POLICY contacts_insert ON public.contacts FOR INSERT TO authenticated
WITH CHECK (public.has_sales_access(auth.uid()));

CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated
USING (
  public.is_ops(auth.uid())
  OR owner_id = auth.uid()
  OR (owner_id IS NULL AND public.has_sales_access(auth.uid()))
)
WITH CHECK (
  public.is_ops(auth.uid())
  OR owner_id = auth.uid()
  OR (owner_id IS NULL AND public.has_sales_access(auth.uid()))
);

CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated
USING (public.is_ops(auth.uid()));

-- ============ sms ============
DROP POLICY IF EXISTS sms_threads_read ON public.sms_threads;
DROP POLICY IF EXISTS sms_threads_write ON public.sms_threads;
DROP POLICY IF EXISTS sms_messages_read ON public.sms_messages;
DROP POLICY IF EXISTS sms_messages_write ON public.sms_messages;

CREATE POLICY sms_threads_read ON public.sms_threads FOR SELECT TO authenticated
USING (
  public.is_ops(auth.uid())
  OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND public.has_sales_access(auth.uid()))
);

CREATE POLICY sms_threads_write ON public.sms_threads FOR ALL TO authenticated
USING (
  public.is_ops(auth.uid())
  OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND public.has_sales_access(auth.uid()))
)
WITH CHECK (
  public.is_ops(auth.uid())
  OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND public.has_sales_access(auth.uid()))
);

CREATE POLICY sms_messages_read ON public.sms_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sms_threads st
    WHERE st.id = sms_messages.thread_id
      AND (
        public.is_ops(auth.uid())
        OR st.assigned_to = auth.uid()
        OR (st.assigned_to IS NULL AND public.has_sales_access(auth.uid()))
      )
  )
);

CREATE POLICY sms_messages_write ON public.sms_messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sms_threads st
    WHERE st.id = sms_messages.thread_id
      AND (
        public.is_ops(auth.uid())
        OR st.assigned_to = auth.uid()
        OR (st.assigned_to IS NULL AND public.has_sales_access(auth.uid()))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sms_threads st
    WHERE st.id = sms_messages.thread_id
      AND (
        public.is_ops(auth.uid())
        OR st.assigned_to = auth.uid()
        OR (st.assigned_to IS NULL AND public.has_sales_access(auth.uid()))
      )
  )
);

-- ============ posts / comments / likes / attachments ============
DROP POLICY IF EXISTS posts_read ON public.posts;
CREATE POLICY posts_read ON public.posts FOR SELECT TO authenticated
USING (public.can_view_post(id, auth.uid()));

DROP POLICY IF EXISTS post_comments_read ON public.post_comments;
CREATE POLICY post_comments_read ON public.post_comments FOR SELECT TO authenticated
USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS post_likes_read ON public.post_likes;
CREATE POLICY post_likes_read ON public.post_likes FOR SELECT TO authenticated
USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS post_attachments_read ON public.post_attachments;
CREATE POLICY post_attachments_read ON public.post_attachments FOR SELECT TO authenticated
USING (public.can_view_post(post_id, auth.uid()));

-- ============ profiles: hide email + phone columns ============
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, department, title, team, avatar_initials, avatar_url, presence, landing, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============ telephony configuration ============
DROP POLICY IF EXISTS telephony_settings_read ON public.telephony_settings;
CREATE POLICY telephony_settings_read ON public.telephony_settings FOR SELECT TO authenticated
USING (public.is_ops(auth.uid()));

DROP POLICY IF EXISTS telephony_status_map_read ON public.telephony_status_map;
CREATE POLICY telephony_status_map_read ON public.telephony_status_map FOR SELECT TO authenticated
USING (public.is_ops(auth.uid()));

DROP POLICY IF EXISTS telephony_dispositions_read ON public.telephony_dispositions;
CREATE POLICY telephony_dispositions_read ON public.telephony_dispositions FOR SELECT TO authenticated
USING (public.is_ops(auth.uid()));

-- ============ storage attachments ============
DROP POLICY IF EXISTS attachments_read ON storage.objects;
CREATE POLICY attachments_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND (owner = auth.uid() OR public.can_read_attachment(name, auth.uid()))
);

-- ============ security definer function execute grants ============
REVOKE EXECUTE ON FUNCTION public.shift_close_stale_sessions(integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_ops(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_call_participant(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_sales_access(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_attachment(text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_sales_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_attachment(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shift_close_stale_sessions(integer) TO service_role;