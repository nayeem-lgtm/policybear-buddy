CREATE TABLE public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  leave_type text not null check (leave_type in ('PTO','Unpaid')),
  start_date date not null,
  end_date date not null,
  days numeric not null default 1,
  reason text,
  status text not null default 'Pending' check (status in ('Pending','Approved','Denied','Cancelled')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX leave_requests_user_idx ON public.leave_requests (user_id);
CREATE INDEX leave_requests_range_idx ON public.leave_requests (start_date, end_date);

GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own leave, ops read all"
ON public.leave_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_ops(auth.uid()) OR public.has_role(auth.uid(), 'HR'));

CREATE POLICY "Users create own leave"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users cancel own pending leave"
ON public.leave_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Ops review leave"
ON public.leave_requests FOR UPDATE TO authenticated
USING (public.is_ops(auth.uid()) OR public.has_role(auth.uid(), 'HR'))
WITH CHECK (public.is_ops(auth.uid()) OR public.has_role(auth.uid(), 'HR'));

CREATE TRIGGER leave_requests_touch BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();