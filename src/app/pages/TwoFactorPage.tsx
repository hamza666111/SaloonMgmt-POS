import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Scissors, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[idx] = val.slice(-1);
    setCode(newCode);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (newCode.every(c => c !== '') && idx === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const c = fullCode || code.join('');
    if (c.length < 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    toast.success('Verified successfully');
    navigate('/branch-selector');
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden grid-pattern">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[400px] fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2563EB] items-center justify-center mb-5 accent-glow">
            <Scissors size={26} color="#fff" strokeWidth={2} />
          </div>
          <div><span className="text-white text-2xl" style={{ fontWeight: 800 }}>LUXE</span><span className="text-[#2563EB] text-2xl" style={{ fontWeight: 800 }}>CUT</span></div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <Shield size={26} className="text-[#2563EB]" />
            </div>
          </div>
          <h1 className="text-white text-xl text-center mb-1" style={{ fontWeight: 700 }}>Two-factor authentication</h1>
          <p className="text-[#6b7280] text-sm text-center mb-8">Enter the 6-digit code from your authenticator app</p>

          <div className="flex gap-2.5 justify-center mb-8">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center text-lg text-white bg-[#1a1a1a] border rounded-xl transition-all"
                style={{
                  fontWeight: 700,
                  height: '52px',
                  borderColor: digit ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.08)',
                  background: digit ? 'rgba(37,99,235,0.08)' : '#1a1a1a',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => handleVerify()}
            disabled={loading || code.some(c => !c)}
            className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-40 text-white rounded-xl py-3.5 text-sm transition-all"
            style={{ fontWeight: 600 }}
          >
            {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Verify Code'}
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-[#6b7280]">Didn't receive a code? </span>
            <button className="text-sm text-[#2563EB] hover:text-blue-400 transition-colors">Resend</button>
          </div>
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
