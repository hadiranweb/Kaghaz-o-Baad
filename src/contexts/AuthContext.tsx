import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  BackendSession,
  BackendUser,
  currentUser,
  login,
  logout,
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

  const signUp = async (
    email: string,
    password: string,
    userData: { first_name: string; last_name: string; phone: string },
  ) => {
    try {
      const response = await register({ email, password, ...userData });
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
          : error instanceof Error ? error.message : 'خطای ناشناخته',
      });
      return { error };
    }
  };

  const signOut = async () => {
    await logout();
    setUser(null);
    setSession(null);
    navigate('/');
  };

  const setSessionFromOtp = async (newSession: FrontendSession) => {
    setToken(newSession.token);
    setSession(newSession);
    setUser(newSession.user);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, setSessionFromOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
