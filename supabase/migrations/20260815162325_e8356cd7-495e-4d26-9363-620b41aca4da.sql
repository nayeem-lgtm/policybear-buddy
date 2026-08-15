-- 1. profiles: keep directory readable, hide contact details via column privileges
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, name, department, title, team, avatar_initials, avatar_url, presence, landing, created_at, updated_at)
  ON public.profiles TO authenticated;

-- 2. user_roles: only own row, or ops/admin
DROP POLICY IF EXISTS user_roles_read_all ON public.user_roles;
CREATE POLICY user_roles_read_own_or_privileged
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_ops(auth.uid()));

-- 3. attachments bucket: explicit owner-scoped update policy
DROP POLICY IF EXISTS attachments_update_own ON storage.objects;
CREATE POLICY attachments_update_own
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attachments' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'attachments' AND owner = auth.uid());

-- 4. SECURITY DEFINER helpers: not callable by signed-out visitors
REVOKE EXECUTE ON FUNCTION public.can_read_attachment(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_sales_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_call_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ops(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shift_close_stale_sessions(integer) FROM PUBLIC, anon, authenticated;