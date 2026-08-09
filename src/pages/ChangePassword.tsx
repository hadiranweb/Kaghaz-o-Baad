import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ChangePassword() {
  const { user, loading } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('رمز باید حداقل ۸ کاراکتر باشد', 'Password must be at least 8 characters') });
      return;
    }
    if (pw !== pw2) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('رمزها یکسان نیستند', 'Passwords do not match') });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error.message });
      return;
    }
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('user_id', user.id);
    }
    setBusy(false);
    toast({ title: t('رمز به‌روز شد', 'Password updated') });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="glass-surface w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('تغییر رمز عبور', 'Change Password')}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t('مدیر رمز عبور شما را تغییر داده است. برای ادامه، لطفاً رمز جدیدی انتخاب کنید.',
               'An admin reset your password. Please choose a new password to continue.')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('رمز جدید', 'New password')} />
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('تکرار رمز جدید', 'Confirm new password')} />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t('در حال ذخیره...', 'Saving...') : t('ذخیره', 'Save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}