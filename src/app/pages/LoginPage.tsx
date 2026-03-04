import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Scissors, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchStore } from '../store/useBranchStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);
  const refreshBranches = useBranchStore((state) => state.refreshBranches);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('saloon_remember_device') !== '0';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rememberDevice) return;

    const rememberedEmail = window.localStorage.getItem('saloon_last_email') || '';
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, [rememberDevice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      await refreshBranches();

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.branchId) {
        setActiveBranch(currentUser.branchId);
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('saloon_remember_device', rememberDevice ? '1' : '0');
        if (rememberDevice) {
          window.localStorage.setItem('saloon_last_email', email.trim());
        } else {
          window.localStorage.removeItem('saloon_last_email');
        }
      }

      toast.success(`Welcome back, ${currentUser?.fullName || 'User'} (${currentUser?.role || 'staff'})`);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden grid-pattern">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[400px] fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2563EB] items-center justify-center mb-5 accent-glow">
            <Scissors size={26} color="#fff" strokeWidth={2} />
          </div>
          <div className="mb-1">
            <span className="text-white text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>LUXE</span>
            <span className="text-[#2563EB] text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>CUT</span>
          </div>
          <p className="text-[#4b5563] text-sm tracking-widest uppercase" style={{ letterSpacing: '0.15em' }}>Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h1 className="text-white text-xl mb-1" style={{ fontWeight: 700 }}>Sign in</h1>
          <p className="text-[#6b7280] text-sm mb-7">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@luxecut.com"
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/60 focus:bg-[#1c1c1c] transition-all"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#9ca3af]" style={{ letterSpacing: '0.05em' }}>PASSWORD</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-[#2563EB] hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/60 focus:bg-[#1c1c1c] transition-all pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#9ca3af] transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="w-4 h-4 rounded-md bg-[#1a1a1a] border border-white/[0.1] flex items-center justify-center cursor-pointer"
                onClick={() => setRememberDevice(prev => !prev)}
                aria-pressed={rememberDevice}
              >
                {rememberDevice && <div className="w-2 h-2 rounded-sm bg-[#2563EB]" />}
              </button>
              <span className="text-sm text-[#6b7280]">Remember this device</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-60 text-white rounded-xl py-3.5 text-sm transition-all mt-2"
              style={{ fontWeight: 600 }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Zap size={14} className="text-[#2563EB]" />
            <span className="text-sm text-[#2563EB]" style={{ fontWeight: 600 }}>Sample Roles for Testing</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Admin', email: 'admin@luxecut.com' },
              { role: 'Manager', email: 'manager@luxecut.com' },
              { role: 'Receptionist', email: 'reception@luxecut.com' },
              { role: 'Barber', email: 'barber@luxecut.com' },
            ].map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword('password123'); }}
                className="py-2 px-1 text-xs border border-[#2563EB]/30 rounded-lg text-white hover:bg-[#2563EB]/20 transition-all"
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#4b5563] mt-6">
          Protected by enterprise-grade security · 256-bit SSL
        </p>
      </div>
    </div>
  );
}
