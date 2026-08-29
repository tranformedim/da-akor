import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminShell } from '@/components/admin/AdminShell';
import type { Admin } from '@/lib/types';

export function AdminApp() {
  const [session, setSession] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setAdmin(data as Admin);
      setSession(true);
    } else {
      setSession(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        checkAdmin(data.session.user.id);
      } else {
        setSession(false);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        if (sess?.user) {
          await checkAdmin(sess.user.id);
        } else {
          setSession(false);
          setAdmin(null);
          setLoading(false);
        }
      })();
    });

    return () => authListener.subscription.unsubscribe();
  }, [checkAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(false);
    setAdmin(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (!session || !admin) {
    return <AdminLogin onLoggedIn={() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) checkAdmin(data.session.user.id);
      });
    }} />;
  }

  return <AdminShell admin={admin} onLogout={handleLogout} />;
}
