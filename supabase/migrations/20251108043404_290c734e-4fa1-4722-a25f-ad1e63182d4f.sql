-- Create users table with extended profile info
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'contributor', 'viewer')),
  avatar_url TEXT,
  bio_en TEXT,
  bio_fa TEXT,
  socials JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary_en TEXT,
  summary_fa TEXT,
  cover_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id),
  coauthors JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create slides table for article content
CREATE TABLE IF NOT EXISTS public.slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  title_en TEXT,
  title_fa TEXT,
  body_en TEXT,
  body_fa TEXT,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create media library table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'pdf', 'link')),
  src_url TEXT NOT NULL,
  thumb_url TEXT,
  provider TEXT,
  folders TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  meta JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create persons table (team members)
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  role_title_en TEXT,
  role_title_fa TEXT,
  avatar_url TEXT,
  bio_en TEXT,
  bio_fa TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  relation TEXT NOT NULL CHECK (relation IN ('owner', 'collaborator')),
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create social links table
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create translations table
CREATE TABLE IF NOT EXISTS public.translations (
  key TEXT PRIMARY KEY,
  en TEXT NOT NULL,
  fa TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Articles policies
CREATE POLICY "Published articles viewable by all" ON public.articles FOR SELECT USING (status = 'published' OR auth.uid() = author_id);
CREATE POLICY "Authors can create articles" ON public.articles FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own articles" ON public.articles FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own articles" ON public.articles FOR DELETE USING (auth.uid() = author_id);

-- Slides policies
CREATE POLICY "Slides viewable with published articles" ON public.slides FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.articles WHERE articles.id = slides.article_id AND (articles.status = 'published' OR articles.author_id = auth.uid()))
);
CREATE POLICY "Authors can manage slides" ON public.slides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.articles WHERE articles.id = slides.article_id AND articles.author_id = auth.uid())
);

-- Media policies
CREATE POLICY "Media viewable by all" ON public.media FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload media" ON public.media FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own media" ON public.media FOR UPDATE USING (auth.uid() = created_by);

-- Persons and social links policies (public read)
CREATE POLICY "Persons viewable by all" ON public.persons FOR SELECT USING (true);
CREATE POLICY "Social links viewable by all" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Translations viewable by all" ON public.translations FOR SELECT USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample translations
INSERT INTO public.translations (key, en, fa) VALUES
  ('nav.home', 'Home', 'خانه'),
  ('nav.read', 'Read', 'مقالات'),
  ('nav.media', 'Media', 'رسانه'),
  ('nav.us', 'About Us', 'درباره ما'),
  ('hero.title', 'Academic Works and Media', 'آثار و رسانه‌های آکادمیک'),
  ('hero.subtitle', 'Paper symbolizes data; Wind symbolizes the living environment', 'کاغذ نماد داده؛ باد نماد محیط زنده'),
  ('article.read_more', 'Read Article', 'مطالعه مقاله'),
  ('auth.login', 'Login', 'ورود'),
  ('auth.phone', 'Phone Number', 'شماره تلفن'),
  ('auth.first_name', 'First Name', 'نام'),
  ('auth.last_name', 'Last Name', 'نام خانوادگی')
ON CONFLICT (key) DO NOTHING;