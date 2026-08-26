import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  BackendSession,
  BackendUser,
  currentUser,
  login,
  logout,
  sendPhoneCode,
  verifyPhoneCode,
  register,
  setToken,
} from '@/lib/auth-api';

export type FrontendUser = BackendUser & {
  user_metadata?: {
    first_name?: string | null;
    last_name?: string | null;
  };
};

export type FrontendSession = BackendSession & {
  access_token: string;
  user: FrontendUser;
};

interface AuthContextType {
  user: FrontendUser | null;
  session: FrontendSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  sendPhoneOtp: (phone: string) => Promise<{ error: unknown | null; expiresIn?: number }>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; phone: string }) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<void>;
  setSessionFromOtp: (session: FrontendSession) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toFrontendUser(user: BackendUser): FrontendUser {
  return {
    ...user,
    user_metadata: {
      first_name: user.first_name,
      last_name: user.last_name,
    },
  };
}

function toSession(response: BackendSession): FrontendSession {
  const user = toFrontendUser(response.user);
  return { ...response, access_token: response.token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [session, setSession] = useState<FrontendSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    currentUser()
      .then((backendUser) => {
        if (cancelled) return;
        const frontendUser = toFrontendUser(backendUser);
        const token = window.localStorage.getItem('kaghazbaad_backend_session_token');
        if (token) {
          setUser(frontendUser);
          setSession({ token, access_token: token, user: frontendUser });
        }
      })
      .catch(() => {
        setToken(null);
        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await login(email, password);
      const nextSession = toSession(response);
      setUser(nextSession.user);
      setSession(nextSession);
      toast({ title: 'ورود موفق', description: 'خوش آمدید' });
      return { error: null };
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطا در ورود',
        description: error instanceof Error && error.message === 'invalid_email_or_password'
          ? 'ایمیل یا رمز عبور نادرست است'
          : error instanceof Error ? error.message : 'خطای ناشناخته',
      });
      return { error };
    }
  };

  const sendPhoneOtp = async (phone: string) => {
    try {
      const response = await sendPhoneCode(phone);
      return { error: null, expiresIn: response.expires_in_seconds };
    } catch (error: unknown) {
      const description = error instanceof Error && error.message === 'sms_provider_not_configured'
        ? 'سرویس پیامک هنوز در backend تنظیم نشده است.'
        : error instanceof Error && error.message === 'sms_provider_failed'
          ? 'ارسال پیامک در حال حاضر ناموفق است. لطفاً چند دقیقه دیگر دوباره تلاش کنید یا از ورود ایمیلی استفاده کنید.'
          : 'امکان ارسال کد ورود فراهم نشد. لطفاً دوباره تلاش کنید.';
      toast({ variant: 'destructive', title: 'خطا در ارسال کد', description });
      return { error };
    }
  };

  const verifyPhoneOtp = async (phone: string, code: string) => {
    try {
      const response = await verifyPhoneCode(phone, code);
      const nextSession = toSession(response);
      setUser(nextSession.user);
      setSession(nextSession);
      toast({ title: 'ورود موفق', description: 'خوش آمدید' });
      return { error: null };
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'کد نامعتبر است', description: error instanceof Error ? error.message : 'کد واردشده معتبر نیست' });
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { first_name: string; last_name: string; phone: string },
  ) => {
    try {
      const response = await register({ email, password, ...userData });
      if ('pending' in response) {
        const pendingError = new Error('email_verification_required');
        toast({ title: 'تأیید ایمیل لازم است', description: 'لینک تأیید به ایمیل شما ارسال شد. پس از کلیک روی لینک، ورود کامل می‌شود.' });
        return { error: pendingError };
      }
      const nextSession = toSession(response);
      setUser(nextSession.user);
      setSession(nextSession);
      toast({ title: 'ثبت‌نام موفق', description: 'حساب کاربری شما ایجاد شد' });
      return { error: null };
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطا در ثبت‌نام',
        description: error instanceof Error && error.message === 'email_already_registered'
          ? 'این ایمیل قبلاً ثبت شده است'
          : error instanceof Error && error.message === 'email_provider_not_configured'
            ? 'ارسال ایمیل تأیید هنوز در backend تنظیم نشده است.'
            : error instanceof Error && error.message === 'email_provider_failed'
              ? 'ارسال ایمیل تأیید ناموفق بود. لطفاً چند دقیقه دیگر دوباره تلاش کنید یا از ورود با شمارهٔ تلفن استفاده کنید.'
              : 'امکان تکمیل ثبت‌نام فراهم نشد. لطفاً دوباره تلاش کنید.',
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch (error) {
      // Local logout must still complete if a best-effort server-side session revoke fails.
      console.warn('Server-side session revoke failed; completing local logout.', error);
    } finally {
      setToken(null);
      setUser(null);
      setSession(null);
      navigate('/', { replace: true });
    }
  };

  const setSessionFromOtp = async (newSession: FrontendSession) => {
    setToken(newSession.token);
    setSession(newSession);
    setUser(newSession.user);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, sendPhoneOtp, verifyPhoneOtp, signUp, signOut, setSessionFromOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
