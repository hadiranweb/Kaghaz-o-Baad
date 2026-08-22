import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Phone, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendPhoneFactorCode, verifyPhoneFactor } from '@/lib/auth-api';

export default function VerifiedFactorsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const sendCode = async () => {
    setBusy(true);
    try {
      const response = await sendPhoneFactorCode(phone);
      setStep('code');
      setSeconds(Math.min(60, response.expires_in_seconds));
      toast({ title: 'کد ارسال شد', description: 'کد تأیید شمارهٔ تلفن برای شما پیامک شد.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'ارسال کد ناموفق بود', description: error instanceof Error ? error.message : 'خطای ناشناخته' });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await verifyPhoneFactor(phone, code);
      setStep('phone');
      setCode('');
      toast({ title: 'شماره تأیید شد', description: 'شمارهٔ تلفن شما به‌عنوان یک عامل تأییدشده ثبت شد.' });
      window.location.reload();
    } catch (error) {
      toast({ variant: 'destructive', title: 'تأیید ناموفق بود', description: error instanceof Error ? error.message : 'کد نامعتبر یا منقضی است.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="glass-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />امنیت و عوامل تأیید</CardTitle>
        <CardDescription>حداقل یک عامل تأییدشده برای حساب شما لازم است. ایمیل اجتماعیِ تأییدشده یا شمارهٔ تلفن تأییدشده این شرط را کامل می‌کند.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">ایمیل <span className={user?.email_verified ? 'text-emerald-600' : 'text-amber-600'}>{user?.email_verified ? 'تأییدشده' : 'تأییدنشده'}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">تلفن <span className={user?.phone_verified ? 'text-emerald-600' : 'text-amber-600'}>{user?.phone_verified ? 'تأییدشده' : 'تأییدنشده'}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{user?.phone || 'ثبت نشده'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {user?.has_verified_factor ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
          <span>{user?.has_verified_factor ? 'حداقل یک عامل تأییدشده فعال است.' : 'هنوز عامل تأییدشده‌ای برای حساب ثبت نشده است.'}</span>
        </div>
        {!user?.phone_verified && (
          <div className="space-y-3 rounded-xl bg-muted/40 p-4">
            <Label htmlFor="factor-phone">شمارهٔ موبایل</Label>
            <Input id="factor-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" dir="ltr" placeholder="۰۹۱۲۱۲۳۴۵۶۷" disabled={step === 'code' || busy} />
            {step === 'code' && <>
              <Label htmlFor="factor-code">کد پیامک‌شده</Label>
              <Input id="factor-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="۱۲۳۴۵۶" disabled={busy} />
            </>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={step === 'phone' ? sendCode : verify} disabled={busy || (step === 'code' && code.length !== 6)}>
                {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : step === 'phone' ? <Phone className="me-2 h-4 w-4" /> : <CheckCircle2 className="me-2 h-4 w-4" />}
                {step === 'phone' ? 'ارسال کد' : 'تأیید شماره'}
              </Button>
              {step === 'code' && <Button variant="outline" onClick={sendCode} disabled={busy || seconds > 0}><RefreshCw className="me-2 h-4 w-4" />{seconds ? `${seconds} ثانیه` : 'ارسال دوباره'}</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
