import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; phone: string }) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  setSessionFromOtp: (session: Session) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_ACCOUNTS: Record<string, { password: string; id: string; first_name: string; last_name: string }> = {
  'admin@kaghazbaad.test': {
    password: 'TestAdmin@2026!',
    id: '00000000-0000-4000-8000-000000000001',
    first_name: 'مدیر',
    last_name: 'تست (Admin)',
  },
  'editor@kaghazbaad.test': {
    password: 'TestEditor@2026!',
    id: '00000000-0000-4000-8000-000000000002',
    first_name: 'ویراستار',
    last_name: 'تست (Editor)',
  },
  'contributor@kaghazbaad.test': {
    password: 'TestContributor@2026!',
    id: '00000000-0000-4000-8000-000000000003',
    first_name: 'نویسنده',
    last_name: 'تست (Contributor)',
  },
  'user@kaghazbaad.test': {
    password: 'TestUser@2026!',
    id: '00000000-0000-4000-8000-000000000004',
    first_name: 'کاربر',
    last_name: 'عادی (User)',
  },
  'hadiranweb@gmail.com': {
    password: 'H@drianus#Jeff2026!Baad',
    id: '00000000-0000-4000-8000-000000000001',
    first_name: 'مدیر',
    last_name: 'اصلی (hadiranweb)',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const previewRaw = localStorage.getItem('kaghazbaad_preview_user');
    if (previewRaw) {
      try {
        const pUser = JSON.parse(previewRaw) as User;
        setUser(pUser);
        setLoading(false);
      } catch {}
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        localStorage.removeItem('kaghazbaad_preview_user');
      } else if (!localStorage.getItem('kaghazbaad_preview_user')) {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        localStorage.removeItem('kaghazbaad_preview_user');
      } else if (!localStorage.getItem('kaghazbaad_preview_user')) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (location.pathname === '/change-password' || location.pathname === '/auth') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data?.must_change_password) {
        navigate('/change-password', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [user, location.pathname, navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const normalizedEmail = email.trim().toLowerCase();
        const testAcc = TEST_ACCOUNTS[normalizedEmail];
        if (testAcc && password === testAcc.password) {
          const previewUser: User = {
            id: testAcc.id,
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { first_name: testAcc.first_name, last_name: testAcc.last_name },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: normalizedEmail,
          } as User;

          localStorage.setItem('kaghazbaad_preview_user', JSON.stringify(previewUser));
          setUser(previewUser);
          toast({
            title: 'ورود موفق در حالت پیش‌نمایش (Sandbox Auth)',
            description: `با موفقیت به عنوان ${testAcc.first_name} ${testAcc.last_name} وارد شدید.`,
          });
          return { error: null };
        }

        toast({
          variant: "destructive",
          title: "خطا در ورود",
          description: error.message === "Invalid login credentials" 
            ? "ایمیل یا رمز عبور نادرست است (می‌توانید از دکمه‌های حساب تستی استفاده کنید)" 
            : error.message,
        });
      }
      
      return { error };
    } catch (error: unknown) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string; phone: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
          }
        }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "خطا در ثبت نام",
          description: error.message === "User already registered" 
            ? "این ایمیل قبلاً ثبت شده است" 
            : error.message,
        });
      } else {
        toast({
          title: "ثبت نام موفق",
          description: "حساب کاربری شما ایجاد شد",
        });
      }
      
      return { error };
    } catch (error: unknown) {
      return { error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('kaghazbaad_preview_user');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const setSessionFromOtp = async (newSession: Session) => {
    const { data } = await supabase.auth.setSession({
      access_token: newSession.access_token,
      refresh_token: newSession.refresh_token,
    });
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, setSessionFromOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
