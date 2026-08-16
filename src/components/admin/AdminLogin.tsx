import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import { Loader2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLoggedIn: () => void;
}

type Mode = 'login' | 'register';

export function AdminLogin({ onLoggedIn }: AdminLoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regCode, setRegCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!adminData) {
          await supabase.auth.signOut();
          throw new Error('This account does not have admin access.');
        }
        if (!adminData.is_active) {
          await supabase.auth.signOut();
          throw new Error('This admin account has been deactivated.');
        }
        onLoggedIn();
      } else {
        if (!fullName.trim() || !regCode.trim()) {
          throw new Error('Please fill in all fields');
        }
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.user) throw new Error('Sign up failed. Please try again.');

        const { error: rpcError } = await supabase.rpc('register_admin', {
          p_code: regCode.trim().toUpperCase(),
          p_full_name: fullName.trim(),
        });
        if (rpcError) {
          await supabase.auth.signOut();
          throw new Error(rpcError.message);
        }
        onLoggedIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-gold-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-forest-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </a>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Logo showText={false} className="h-12 w-12" />
              <div>
                <h1 className="font-display text-xl font-extrabold text-gray-900">Da Akɔ</h1>
                <p className="text-xs text-gold-600 font-medium uppercase tracking-wider">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <ShieldCheck className="h-4 w-4 text-forest-500" />
              Secure admin access
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Code</label>
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="8-character code"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all font-mono uppercase"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Get a code from an existing admin.</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Admin Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
