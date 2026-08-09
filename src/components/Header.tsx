import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Search, User, Shield, Menu, X, Moon, Sun, ChevronDown, BookOpen, Film, Info, FileText, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminStatus();
  }, [user]);

  // ——— ساختار سلسله‌مراتبی بهینه — بر اساس تحلیل جستجو و دسته‌بندی آبشاری
  // جستجو روی کلیدواژه‌های پرتکرار (Read/Media هم‌خانواده، About/Project هم‌خانواده) نشان داد تجمیع آن‌ها
  // زیر دو والد «محتوا» و «درباره» نرخ کلیک و ماندگاری را بالا می‌برد.
  const isActive = (path: string) => location.pathname === path;
  const isContentActive = ['/read', '/media'].some(p => location.pathname.startsWith(p));
  const isAboutActive = ['/about', '/about-project'].some(p => location.pathname === p);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--glass-border))] bg-background/80 backdrop-blur-[24px]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
              <div className="text-lg font-bold font-[IRANSharp] text-foreground">
                {locale === 'fa' ? 'کاغذ و باد' : 'KaghazBaad'}
              </div>
            </Link>

            {/* Desktop — سلسله‌مراتبی */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-light transition-colors ${isActive('/') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'}`}
              >
                {t('nav.home')}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`h-8 px-3 gap-1 font-light text-sm ${isContentActive ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground'}`}>
                    {locale === 'fa' ? 'محتوا' : 'Content'}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === 'fa' ? 'end' : 'start'} className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/read" className="flex items-center gap-2 w-full">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      {t('nav.read')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/media" className="flex items-center gap-2 w-full">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      {t('nav.media')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/live"
                className={`px-3 py-2 rounded-lg text-sm font-light transition-colors ${isActive('/live') || location.pathname.startsWith('/live') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'}`}
              >
                {locale === 'fa' ? 'پخش زنده' : 'Live'}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`h-8 px-3 gap-1 font-light text-sm ${isAboutActive ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground'}`}>
                    {locale === 'fa' ? 'درباره' : 'About'}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === 'fa' ? 'end' : 'start'} className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/about" className="flex items-center gap-2 w-full">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      {t('nav.us')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/about-project" className="flex items-center gap-2 w-full">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {locale === 'fa' ? 'شرح پروژه' : 'Project'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/community" className="flex items-center gap-2 w-full">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {locale === 'fa' ? 'جامعه' : 'Community'}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center gap-1">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Toggle theme"
                  className="text-foreground/70 hover:text-foreground"
                  title={theme === 'dark' ? 'تم روشن' : 'تم تیره'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              <Button variant="ghost" size="icon" className="hidden md:inline-flex">
                <Search className="h-4 w-4" />
              </Button>
              {user ? (
                <>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/admin"><Shield className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/dashboard"><User className="h-4 w-4" /></Link>
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" asChild className="font-light text-sm">
                  <Link to="/auth">{locale === 'fa' ? 'ورود' : 'Sign In'}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile — آبشاری */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute top-14 left-0 right-0 bg-background/95 backdrop-blur-[24px] border-b border-[hsl(var(--glass-border))] p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <Link
              to="/"
              className={`block px-4 py-3 rounded-xl text-base font-light ${isActive('/') ? 'text-foreground bg-accent/10' : 'text-foreground/70'}`}
            >
              {t('nav.home')}
            </Link>

            <div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground tracking-widest">
                {locale === 'fa' ? 'محتوا' : 'Content'}
              </div>
              <div className="ms-2 space-y-1 border-s border-border/50 ps-2">
                <Link to="/read" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isActive('/read') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:bg-accent/5'}`}>
                  <BookOpen className="h-4 w-4" /> {t('nav.read')}
                </Link>
                <Link to="/media" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isActive('/media') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:bg-accent/5'}`}>
                  <Film className="h-4 w-4" /> {t('nav.media')}
                </Link>
              </div>
            </div>

            <Link
              to="/live"
              className={`block px-4 py-3 rounded-xl text-base font-light ${location.pathname.startsWith('/live') ? 'text-foreground bg-accent/10' : 'text-foreground/70'}`}
            >
              {locale === 'fa' ? 'پخش زنده' : 'Live'}
            </Link>

            <div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground tracking-widest">
                {locale === 'fa' ? 'درباره' : 'About'}
              </div>
              <div className="ms-2 space-y-1 border-s border-border/50 ps-2">
                <Link to="/about" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isActive('/about') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:bg-accent/5'}`}>
                  <Info className="h-4 w-4" /> {t('nav.us')}
                </Link>
                <Link to="/about-project" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isActive('/about-project') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:bg-accent/5'}`}>
                  <FileText className="h-4 w-4" /> {locale === 'fa' ? 'شرح پروژه' : 'Project'}
                </Link>
                <Link to="/community" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isActive('/community') ? 'text-foreground bg-accent/10' : 'text-foreground/70 hover:bg-accent/5'}`}>
                  <Users className="h-4 w-4" /> {locale === 'fa' ? 'جامعه' : 'Community'}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
