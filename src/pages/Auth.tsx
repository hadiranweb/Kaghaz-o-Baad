import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Phone, ArrowRight, RefreshCw } from 'lucide-react';

type Mode = 'signin' | 'signup';
type Method = 'phone' | 'email';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const rawNext = searchParams.get('next') ?? '';
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';
  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  useEffect(() => { if (user && !loading) navigate(nextPath || '/dashboard'); }, [user, loading, navigate, nextPath]);
  useEffect(() => { if (!resendSeconds) return; const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [resendSeconds]);

  const submitPhone = async () => {
    if (!/^((\+98|0098|0)?9\d{9})$/.test(phone.replace(/[\s-]/g, ''))) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('شمارهٔ موبایل معتبر نیست', 'Enter a valid Iranian mobile number') }); return;
    }
    setSubmitting(true);
    try {
      if (phoneStep === 'phone') {
        const result = await sendPhoneOtp(phone);
        if (result.error) return;
        setPhoneStep('code'); setResendSeconds(result.expiresIn ? Math.min(60, result.expiresIn) : 60);
        toast({ title: t('کد ارسال شد', 'Code sent'), description: t('کد یک‌بارمصرف برای شما پیامک شد', 'The verification code was sent by SMS') });
      } else {
        const result = await verifyPhoneOtp(phone, code);
        if (result.error) return;
        navigate(nextPath || (mode === 'signup' ? '/complete-profile' : '/dashboard'));
      }
    } finally { setSubmitting(false); }
  };

  const submitEmail = async () => {
    if (!email.includes('@')) { toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('ایمیل نامعتبر است', 'Invalid email') }); return; }
    if (password.length < 8) { toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('رمز عبور باید حداقل ۸ کاراکتر باشد', 'Password must be at least 8 characters') }); return; }
    setSubmitting(true);
    try {
      const result = mode === 'signup' ? await signUp(email, password, { first_name: firstName, last_name: lastName, phone }) : await signIn(email, password);
      if (!result.error) navigate(nextPath || (mode === 'signup' ? '/complete-profile' : '/dashboard'));
    } finally { setSubmitting(false); }
  };

  const switchMethod = (next: Method) => { setMethod(next); setPhoneStep('phone'); setCode(''); };
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground/30" /></div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[image:var(--hero-gradient)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" />
      <div className="relative z-10 w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">{t('کاغذ و باد', 'KaghazBaad')}</h1>
          <p className="text-sm text-muted-foreground">{method === 'phone' ? t('ورود سریع و امن با شمارهٔ تلفن', 'Fast and secure phone sign in') : mode === 'signin' ? t('با ایمیل و رمز عبور وارد شوید', 'Sign in with email and password') : t('حساب کاربری خود را بسازید', 'Create your account')}</p>
        </div>
        <div className="flex gap-2 p-1 rounded-2xl bg-secondary/40">
          <Button type="button" variant={method === 'phone' ? 'default' : 'ghost'} className="flex-1 rounded-xl" onClick={() => switchMethod('phone')}><Phone className="w-4 h-4 ml-2" />{t('شماره تلفن', 'Phone')}</Button>
          <Button type="button" variant={method === 'email' ? 'default' : 'ghost'} className="flex-1 rounded-xl" onClick={() => switchMethod('email')}><Mail className="w-4 h-4 ml-2" />{t('ایمیل', 'Email')}</Button>
        </div>
        <div className="space-y-4">
          {method === 'phone' ? <>
            <div className="space-y-2"><Label className="text-xs text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{t('شمارهٔ موبایل', 'Mobile number')}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" dir="ltr" inputMode="tel" autoComplete="tel" disabled={phoneStep === 'code'} className="h-12 rounded-[16px] bg-secondary/50" /></div>
            {phoneStep === 'code' && <div className="space-y-2"><Label className="text-xs text-muted-foreground flex items-center gap-2"><Lock className="w-3.5 h-3.5" />{t('کد پیامک‌شده', 'SMS code')}</Label><Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="۱۲۳۴۵۶" dir="ltr" inputMode="numeric" autoComplete="one-time-code" onKeyDown={(e) => e.key === 'Enter' && submitPhone()} className="h-12 rounded-[16px] bg-secondary/50 tracking-[0.4em]" />
              <div className="flex justify-between text-xs text-muted-foreground"><button type="button" disabled={resendSeconds > 0 || submitting} onClick={() => { setPhoneStep('phone'); submitPhone(); }} className="hover:text-foreground disabled:opacity-50 flex items-center gap-1"><RefreshCw className="w-3 h-3" />{resendSeconds ? `${resendSeconds} ثانیه` : t('ارسال دوباره', 'Resend')}</button><button type="button" onClick={() => setPhoneStep('phone')} className="hover:text-foreground">{t('تغییر شماره', 'Change number')}</button></div>
            </div>}
            <Button variant="glass" className="w-full h-12" onClick={submitPhone} disabled={submitting}>{submitting ? t('در حال پردازش...', 'Processing...') : phoneStep === 'phone' ? t('دریافت کد ورود', 'Send login code') : t('تأیید و ورود', 'Verify and sign in')}<ArrowRight className="w-4 h-4 mr-2" /></Button>
          </> : <>
            {mode === 'signup' && <div className="grid grid-cols-2 gap-3"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('نام', 'First name')} className="h-12 rounded-[16px] bg-secondary/50" /><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('نام خانوادگی', 'Last name')} className="h-12 rounded-[16px] bg-secondary/50" /></div>}
            <div className="space-y-2"><Label className="text-xs text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{t('ایمیل', 'Email')}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" autoComplete="email" className="h-12 rounded-[16px] bg-secondary/50" /></div>
            <div className="space-y-2"><Label className="text-xs text-muted-foreground flex items-center gap-2"><Lock className="w-3.5 h-3.5" />{t('رمز عبور', 'Password')}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} onKeyDown={(e) => e.key === 'Enter' && submitEmail()} className="h-12 rounded-[16px] bg-secondary/50" /></div>
            <Button variant="glass" className="w-full h-12" onClick={submitEmail} disabled={submitting}>{submitting ? t('در حال پردازش...', 'Processing...') : mode === 'signin' ? t('ورود', 'Sign in') : t('ثبت‌نام', 'Sign up')}</Button>
          </>}
          <div className="text-center"><button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setPhoneStep('phone'); }} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">{mode === 'signin' ? t('حساب کاربری ندارید؟ ثبت‌نام کنید', "Don't have an account? Sign up") : t('حساب دارید؟ وارد شوید', 'Already have an account? Sign in')}</button></div>
        </div>
      </div>
    </div>
  );
}
