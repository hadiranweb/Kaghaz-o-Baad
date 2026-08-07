
-- 1. Profiles: remove public policy that exposed phone, create a safe view
DROP POLICY IF EXISTS "Public view published author profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT id, user_id, first_name, last_name, avatar_url, bio_en, bio_fa, socials
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Media: allow owners and admins to delete their media
CREATE POLICY "Users and admins can delete media"
ON public.media
FOR DELETE
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- 3. OTP codes: explicit deny for client roles (server-side only via service role)
REVOKE ALL ON public.otp_codes FROM anon, authenticated;

-- 4. Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. Revoke EXECUTE on trigger / internal SECURITY DEFINER functions from client roles
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
