import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canAccessAdmin, loading: checkingAdmin } = useRole();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!checkingAdmin && !loading && user) {
      if (canAccessAdmin) {
        navigate('/dashboard?view=all_articles', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, checkingAdmin, canAccessAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );
}
