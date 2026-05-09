-- Central allowlist for the small private deployment.
-- Add more accounts later with:
-- INSERT INTO public.allowed_auth_emails (email) VALUES ('person@example.com');

CREATE TABLE IF NOT EXISTS public.allowed_auth_emails (
  email       TEXT PRIMARY KEY CHECK (email = lower(trim(email))),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_auth_emails ENABLE ROW LEVEL SECURITY;

INSERT INTO public.allowed_auth_emails (email)
VALUES ('yuriy.shavlov@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_allowed_auth_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_auth_emails a
    WHERE a.email = lower(trim($1))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_allowed_auth_email(auth.jwt() ->> 'email');
$$;

REVOKE ALL ON FUNCTION public.is_allowed_auth_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_allowed_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_allowed_auth_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_allowed_user() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_allowed_auth_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_allowed_auth_email(NEW.email) THEN
    RAISE EXCEPTION 'Email is not allowed to access this app'
      USING ERRCODE = '28000';
  END IF;

  NEW.email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_allowed_auth_email ON auth.users;
CREATE TRIGGER enforce_allowed_auth_email
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_allowed_auth_email();

CREATE OR REPLACE FUNCTION public.enforce_allowed_auth_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_email TEXT;
BEGIN
  SELECT u.email
  INTO session_email
  FROM auth.users u
  WHERE u.id = NEW.user_id;

  IF NOT public.is_allowed_auth_email(session_email) THEN
    RAISE EXCEPTION 'Email is not allowed to access this app'
      USING ERRCODE = '28000';
  END IF;

  RETURN NEW;
END;
$$;

DELETE FROM auth.sessions s
USING auth.users u
WHERE s.user_id = u.id
  AND NOT public.is_allowed_auth_email(u.email);

DROP TRIGGER IF EXISTS enforce_allowed_auth_session ON auth.sessions;
CREATE TRIGGER enforce_allowed_auth_session
  BEFORE INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_allowed_auth_session();

DROP POLICY IF EXISTS "fuel_entries_select" ON public.fuel_entries;
DROP POLICY IF EXISTS "fuel_entries_insert" ON public.fuel_entries;
DROP POLICY IF EXISTS "fuel_entries_update" ON public.fuel_entries;
DROP POLICY IF EXISTS "fuel_entries_delete" ON public.fuel_entries;

CREATE POLICY "fuel_entries_select" ON public.fuel_entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "fuel_entries_insert" ON public.fuel_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "fuel_entries_update" ON public.fuel_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "fuel_entries_delete" ON public.fuel_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user());

DROP POLICY IF EXISTS "other_costs_select" ON public.other_costs;
DROP POLICY IF EXISTS "other_costs_insert" ON public.other_costs;
DROP POLICY IF EXISTS "other_costs_update" ON public.other_costs;
DROP POLICY IF EXISTS "other_costs_delete" ON public.other_costs;

CREATE POLICY "other_costs_select" ON public.other_costs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "other_costs_insert" ON public.other_costs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "other_costs_update" ON public.other_costs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed_user());

CREATE POLICY "other_costs_delete" ON public.other_costs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed_user());
