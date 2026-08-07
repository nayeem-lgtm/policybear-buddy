DROP INDEX IF EXISTS public.contacts_phone_unique;
CREATE UNIQUE INDEX contacts_phone_unique ON public.contacts (phone);