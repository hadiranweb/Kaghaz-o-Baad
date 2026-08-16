-- Fix Security Issue #1: Move roles from profiles to separate user_roles table
-- Create enum type for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'contributor', 'user');

-- Create user_roles table with proper structure
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  user_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'editor' THEN 'editor'::app_role
    WHEN role = 'contributor' THEN 'contributor'::app_role
    ELSE 'user'::app_role
  END as role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Add RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fix Security Issue #2: Restrict profile data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create granular policies for profiles
-- Policy 1: Users can view their own full profile
CREATE POLICY "Users view own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Public can view basic author info for published articles only
CREATE POLICY "Public view published author profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.articles
    WHERE articles.author_id = profiles.id
    AND articles.status = 'published'
  )
);

-- Note: PostgreSQL RLS doesn't support column-level restrictions in policies directly,
-- so phone numbers are still technically accessible but only for published authors.
-- Application layer should filter sensitive fields when displaying public profiles.