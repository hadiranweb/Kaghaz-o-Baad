import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'editor' | 'contributor' | 'user';

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchRoles() {
      if (!user) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (active) {
        if (!error && data) {
          setRoles(data.map((r) => r.role as AppRole));
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    }

    fetchRoles();

    return () => {
      active = false;
    };
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isEditor = hasRole('editor');
  const isContributor = hasRole('contributor');
  const isUser = hasRole('user');
  const canAccessAdmin = isAdmin || isEditor;

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isEditor,
    isContributor,
    isUser,
    canAccessAdmin,
  };
}
