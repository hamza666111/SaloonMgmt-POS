import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Scissors, ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestPasswordReset = useAuthStore(state => state.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success('Recovery email sent');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send recovery email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden grid-pattern">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[400px] fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2563EB] items-center justify-center mb-5 accent-glow">
            <Scissors size={26} color="#fff" strokeWidth={2} />
          </div>
          <div><span className="text-white text-2xl" style={{ fontWeight: 800 }}>LUXE</span><span className="text-[#2563EB] text-2xl" style={{ fontWeight: 800 }}>CUT</span></div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {!sent ? (
            <>
              <h1 className="text-white text-xl mb-1" style={{ fontWeight: 700 }}>Reset password</h1>
              <p className="text-[#6b7280] text-sm mb-7">We'll send a recovery link to your email</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@luxecut.com"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/60 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-60 text-white rounded-xl py-3.5 text-sm transition-all"
                  style={{ fontWeight: 600 }}
                >
                  {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><span>Send Recovery Link</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-[#10b981]" />
              </div>
              <h2 className="text-white text-lg mb-2" style={{ fontWeight: 700 }}>Check your inbox</h2>
              <p className="text-[#6b7280] text-sm mb-6">We sent a recovery link to <span className="text-white">{email}</span></p>
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-white/[0.08] hover:bg-[#222222] text-white rounded-xl py-3.5 text-sm transition-all"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 mx-auto mt-6 text-sm text-[#6b7280] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
