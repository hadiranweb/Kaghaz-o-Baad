import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rawNext = searchParams.get('next') ?? '';
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  useEffect(() => {
    if (user && !loading) navigate(nextPath || '/dashboard');
  }, [user, loading, navigate, nextPath]);

  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  const handleSubmit = async () => {
    if (!email.includes('@')) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('ایمیل نامعتبر است', 'Invalid email') });
      return;
    }
    if (password.length < 6) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('رمز عبور باید حداقل ۶ کاراکتر باشد', 'Password must be at least 6 characters') });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}${nextPath || '/dashboard'}`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { first_name: firstName, last_name: lastName, phone: '' },
          },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already') || msg.includes('registered')) {
            toast({ variant: 'destructive', title: t('این ایمیل قبلاً ثبت شده', 'Email already registered'), description: t('لطفاً وارد شوید', 'Please sign in instead') });
            setMode('signin');
          } else {
            throw error;
          }
          return;
        }
        if (data.session) {
          toast({ title: t('ثبت‌نام موفق', 'Account created'), description: t('خوش آمدید', 'Welcome') });
          navigate(nextPath || '/complete-profile');
        } else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
          navigate(nextPath || '/complete-profile');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast({
            variant: 'destructive',
            title: t('خطا در ورود', 'Sign-in error'),
            description: error.message === 'Invalid login credentials'
              ? t('ایمیل یا رمز عبور نادرست است', 'Invalid email or password')
              : error.message,
          });
          return;
        }
        toast({ title: t('ورود موفق', 'Signed in'), description: t('خوش آمدید', 'Welcome back') });
        navigate(nextPath || '/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error.message || t('خطای ناشناخته', 'Unknown error') });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[image:var(--hero-gradient)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      <div className="relative z-10 w-full max-w-[380px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            {t('کاغذ و باد', 'Kaghaz o Baad')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin'
              ? t('برای ورود، ایمیل و رمز عبور خود را وارد کنید', 'Sign in with your email and password')
              : t('برای ثبت‌نام، اطلاعات خود را وارد کنید', 'Create an account')}
          </p>
        </div>

        <div className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('نام', 'First name')}
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-[16px] bg-secondary/50 border-[hsl(var(--glass-border))] text-foreground backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('نام خانوادگی', 'Last name')}
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-[16px] bg-secondary/50 border-[hsl(var(--glass-border))] text-foreground backdrop-blur-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              {t('ایمیل', 'Email')}
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              autoComplete="email"
              className="h-12 rounded-[16px] bg-secondary/50 border-[hsl(var(--glass-border))] text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              {t('رمز عبور', 'Password')}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="h-12 rounded-[16px] bg-secondary/50 border-[hsl(var(--glass-border))] text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
            />
          </div>

          <Button variant="glass" className="w-full h-12" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('در حال پردازش...', 'Processing...')
              : mode === 'signin'
                ? t('ورود', 'Sign In')
                : t('ثبت‌نام', 'Sign Up')}
          </Button>

          <div className="text-center">
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              {mode === 'signin'
                ? t('حساب کاربری ندارید؟ ثبت‌نام کنید', "Don't have an account? Sign up")
                : t('حساب دارید؟ وارد شوید', 'Already have an account? Sign in')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}