import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Shield, Menu, X, Moon, Sun, ChevronDown, BookOpen, Film, Info, FileText, Users, LayoutDashboard, Globe, Settings, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { EditorialDock } from '@/components/creative';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { locale, t } = useLanguage();
  const { user, signOut } = useAuth();
  const { canAccessAdmin, isAdmin, isEditor, isContributor } = useRole();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isContentActive = ['/read', '/media'].some(p => location.pathname.startsWith(p));
  const isAboutActive = ['/about', '/about-project'].some(p => location.pathname === p);
  const isDashboardMode = location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard');

  return (
    <>
      <header className="kb-masthead sticky top-0 z-50 w-full border-b border-[hsl(var(--glass-border))] bg-background/85 backdrop-blur-[24px]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="kb-brand-lockup group flex items-center gap-3 shrink-0" aria-label={locale === 'fa' ? 'کاغذ و باد — صفحهٔ اصلی' : 'KaghazBaad — Home'}>
              <span className="kb-brand-mark" aria-hidden="true"><span /></span>
              <span className="flex flex-col leading-none">
                <span className="kb-brand-name text-lg font-bold text-foreground transition-colors group-hover:text-primary">{locale === 'fa' ? 'کاغذ و باد' : 'KaghazBaad'}</span>
                <span className="kb-brand-caption mt-1 hidden text-[9px] uppercase tracking-[.24em] text-muted-foreground sm:block">{locale === 'fa' ? 'نوشتن · خواندن · گفت‌وگو' : 'write · read · return'}</span>
              </span>
            </Link>

            {/* Desktop — editorial dock / Sylva proximity port */}
            <EditorialDock
              ariaLabel={locale === 'fa' ? 'ناوبری اصلی' : 'Primary navigation'}
              items={[
                { id: 'home', label: t('خانه', 'Home'), href: '/', active: isActive('/') },
                { id: 'read', label: t('مطالعه', 'Read'), href: '/read', active: isContentActive && location.pathname.startsWith('/read') },
                { id: 'media', label: t('رسانه', 'Media'), href: '/media', active: location.pathname.startsWith('/media') },
                { id: 'live', label: t('زنده', 'Live'), href: '/live', active: location.pathname.startsWith('/live') },
                { id: 'about', label: t('پروژه', 'Project'), href: '/about-project', active: isAboutActive },
              ]}
              className="hidden md:flex"
            />
            <nav className="kb-primary-nav hidden items-center gap-1" aria-label={locale === 'fa' ? 'ناوبری اصلی' : 'Primary navigation'}>
              <Link
                to="/"
                className={`kb-nav-link px-3 py-2 rounded-lg text-sm font-light transition-colors ${isActive('/') ? 'is-active text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'}`}
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
                      {locale === 'fa' ? 'چندرسانه‌ای' : 'Media'}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/live"
                className={`kb-nav-link px-3 py-2 rounded-lg text-sm font-light transition-colors ${isActive('/live') || location.pathname.startsWith('/live') ? 'is-active text-foreground bg-accent/10' : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'}`}
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

            <div className="flex items-center gap-2">
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

              <Button variant="ghost" size="icon" className="hidden md:inline-flex" asChild>
                <Link to="/read"><Search className="h-4 w-4" /></Link>
              </Button>

              {user ? (
                <div className="flex items-center gap-2">
                  {/* دکمه سوئیچ دو حالته: سایت عمومی (سئوشده) ↔ داشبورد اختصاصی نقش */}
                  {isDashboardMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 gap-1.5 rounded-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs px-3 shadow-sm"
                      title={locale === 'fa' ? 'سوئیچ به نمایش عمومی و سئوشده سایت' : 'Switch to public SEO site'}
                    >
                      <Link to="/">
                        <Globe className="h-3.5 w-3.5 animate-pulse" />
                        <span className="hidden sm:inline">{locale === 'fa' ? 'سایت عمومی' : 'Public Site'}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 gap-1.5 rounded-full border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 text-xs px-3 shadow-sm"
                      title={locale === 'fa' ? 'سوئیچ به داشبورد اختصاصی نقش شما' : 'Switch to your role workspace'}
                    >
                      <Link to={canAccessAdmin ? '/admin' : '/dashboard'}>
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{locale === 'fa' ? 'داشبورد من' : 'My Dashboard'}</span>
                      </Link>
                    </Button>
                  )}

                  {/* آواتار کاربر و منوی پروفایل */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 p-0 overflow-hidden">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                          <AvatarFallback className="text-[11px] bg-secondary text-secondary-foreground font-semibold">
                            {(user.user_metadata?.first_name || user.email || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={locale === 'fa' ? 'end' : 'start'} className="w-56 p-2">
                      <div className="px-2 py-1.5 border-b border-border/40 mb-1">
                        <div className="text-xs font-semibold truncate">
                          {[user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') || t('کاربر', 'User')}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate" dir="ltr">
                          {user.email}
                        </div>
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {isAdmin
                              ? t('مدیر (Admin)', 'Admin')
                              : isEditor
                              ? t('ویرایشگر (Editor)', 'Editor')
                              : isContributor
                              ? t('نویسنده (Contributor)', 'Contributor')
                              : t('کاربر (User)', 'User')}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={canAccessAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 w-full text-xs cursor-pointer">
                          <LayoutDashboard className="h-3.5 w-3.5" />
                          <span>{t('داشبورد اختصاصی من', 'My Workspace')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/complete-profile" className="flex items-center gap-2 w-full text-xs cursor-pointer">
                          <User className="h-3.5 w-3.5" />
                          <span>{t('ویرایش پروفایل', 'Edit Profile')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/change-password" className="flex items-center gap-2 w-full text-xs cursor-pointer">
                          <Settings className="h-3.5 w-3.5" />
                          <span>{t('تغییر رمز عبور', 'Security Settings')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex items-center gap-2 w-full text-xs text-destructive cursor-pointer mt-1 border-t border-border/40 pt-2"
                        onClick={() => signOut()}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{t('خروج از حساب', 'Sign Out')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
          <nav className="kb-mobile-nav absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-[24px] border-b border-[hsl(var(--glass-border))] p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto" aria-label={locale === 'fa' ? 'ناوبری موبایل' : 'Mobile navigation'}>
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
                  <Film className="h-4 w-4" /> {locale === 'fa' ? 'چندرسانه‌ای' : 'Media'}
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
