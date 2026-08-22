import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifyEmail } from '@/lib/auth-api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSessionFromOtp } = useAuth();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('در حال تأیید ایمیل…');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('پیوند تأیید ایمیل ناقص است.');
      return;
    }
    verifyEmail(token)
      .then(async (response) => {
        await setSessionFromOtp({ token: response.token, access_token: response.token, user: response.user });
        setState('success');
        setMessage('ایمیل شما با موفقیت تأیید شد.');
        window.setTimeout(() => navigate('/dashboard', { replace: true }), 900);
      })
      .catch((error: unknown) => {
        setState('error');
        setMessage(error instanceof Error && error.message === 'invalid_or_expired_verification_token' ? 'این پیوند منقضی یا قبلاً مصرف شده است.' : 'تأیید ایمیل انجام نشد.');
      });
  }, [navigate, searchParams, setSessionFromOtp]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {state === 'loading' && <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />}
        {state === 'success' && <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />}
        {state === 'error' && <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />}
        <h1 className="text-xl font-semibold">تأیید ایمیل</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        {state === 'error' && <Button asChild className="mt-6"><Link to="/auth">بازگشت به ورود</Link></Button>}
      </div>
    </div>
  );
}
