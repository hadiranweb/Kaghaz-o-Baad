
-- Table for storing OTP codes
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or phone number
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access this table
-- No public policies needed - all access via edge functions

-- Index for lookups
CREATE INDEX idx_otp_codes_identifier ON public.otp_codes (identifier, code, type);

-- Auto-cleanup old codes (optional trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_otps_on_insert
AFTER INSERT ON public.otp_codes
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
