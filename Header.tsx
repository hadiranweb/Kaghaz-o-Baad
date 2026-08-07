import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Search, User, Shield, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export const Header = () => {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Close mobile menu on route change
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

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/read', label: t('nav.read') },
    { to: '/media', label: t('nav.media') },
    { to: '/live', label: locale === 'fa' ? 'پخش زنده' : 'Live' },
    { to: '/about', label: t('nav.us') },
    { to: '/about-project', label: locale === 'fa' ? 'شرح پروژه' : 'Project' },
  ];

  // On home page, show minimal header (just auth)
  if (isHome) {
    return (
      <header className="absolute top-0 right-0 z-50 p-4">
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="text-foreground/60 hover:text-foreground font-light">
                  <Link to="/admin"><Shield className="h-4 w-4" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild className="text-foreground/60 hover:text-foreground font-light">
                <Link to="/dashboard"><User className="h-4 w-4" /></Link>
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild className="text-foreground/60 hover:text-foreground font-light text-sm">
              <Link to="/auth">{locale === 'fa' ? 'ورود' : 'Sign In'}</Link>
            </Button>
          )}
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--glass-border))] bg-background/80 backdrop-blur-[24px]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="text-lg font-bold bg-hero-gradient bg-clip-text text-transparent">
                {locale === 'fa' ? 'کاغذ و باد' : 'Kaghaz-o-Baad'}
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-light transition-colors ${
                    location.pathname === link.to
                      ? 'text-foreground'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              {/* Mobile hamburger */}
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

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu panel */}
          <nav className="absolute top-14 left-0 right-0 bg-background/95 backdrop-blur-[24px] border-b border-[hsl(var(--glass-border))] p-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block px-4 py-3 rounded-xl text-base font-light transition-colors ${
                  location.pathname === link.to
                    ? 'text-foreground bg-accent/10'
                    : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
};
