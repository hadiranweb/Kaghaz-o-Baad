import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; phone: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setSessionFromOtp: (session: Session) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Force password change on next sign-in when admin has reset the password
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
        toast({
          variant: "destructive",
          title: "خطا در ورود",
          description: error.message === "Invalid login credentials" 
            ? "ایمیل یا رمز عبور نادرست است" 
            : error.message,
        });
      }
      
      return { error };
    } catch (error: any) {
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
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
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