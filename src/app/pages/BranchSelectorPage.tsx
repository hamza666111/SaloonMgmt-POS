import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Scissors, MapPin, Users, TrendingUp, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useBranchStore } from '../store/useBranchStore';

export function BranchSelectorPage() {
  const navigate = useNavigate();
  const branches = useBranchStore(state => state.branches);
  const setActiveBranch = useBranchStore(state => state.setActiveBranch);
  const refreshBranches = useBranchStore(state => state.refreshBranches);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshBranches();
  }, [refreshBranches]);

  const branchCards = useMemo(() => {
    return branches.map((branch, index) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      staff: 3 + (index % 4),
      todayRevenue: 1800 + (index * 640),
      status: branch.isActive ? 'Open' : 'Closed',
      capacity: Math.min(92, 52 + (index * 13)),
    }));
  }, [branches]);

  const handleSelect = async (id: string) => {
    setSelected(id);
    setLoading(true);
    try {
      setActiveBranch(id);
      const branch = branchCards.find(item => item.id === id);
      toast.success(`Entering ${branch?.name || 'selected'} branch`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden grid-pattern">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[480px] fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2563EB] items-center justify-center mb-5 accent-glow">
            <Scissors size={26} color="#fff" strokeWidth={2} />
          </div>
          <div><span className="text-white text-2xl" style={{ fontWeight: 800 }}>LUXE</span><span className="text-[#2563EB] text-2xl" style={{ fontWeight: 800 }}>CUT</span></div>
          <p className="text-[#6b7280] text-sm mt-2">Select your branch to continue</p>
        </div>

        <div className="space-y-3">
          {branchCards.map(branch => (
            <button
              key={branch.id}
              onClick={() => handleSelect(branch.id)}
              disabled={loading}
              className="w-full text-left p-5 rounded-2xl transition-all group relative overflow-hidden"
              style={{
                background: selected === branch.id ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px)',
                border: selected === branch.id ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {loading && selected === branch.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                  <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                    style={{ background: selected === branch.id ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)' }}>
                    <MapPin size={18} className={selected === branch.id ? 'text-[#2563EB]' : 'text-[#6b7280]'} />
                  </div>
                  <div>
                    <div className="text-white text-base mb-0.5" style={{ fontWeight: 600 }}>{branch.name}</div>
                    <div className="text-[#6b7280] text-xs mb-3">{branch.address}</div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-[#4b5563]" />
                        <span className="text-xs text-[#6b7280]">{branch.staff} staff</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-[#4b5563]" />
                        <span className="text-xs text-[#6b7280]">${branch.todayRevenue.toLocaleString()} today</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        <span className="text-xs text-[#10b981]">{branch.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selected === branch.id ? 'bg-[#2563EB]' : 'border border-white/10'}`}>
                    {selected === branch.id && <Check size={14} color="#fff" />}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#4b5563] mb-1">Capacity</div>
                    <div className="text-sm text-white" style={{ fontWeight: 600 }}>{branch.capacity}%</div>
                  </div>
                </div>
              </div>
              {/* Capacity bar */}
              <div className="mt-4 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${branch.capacity}%`, background: branch.capacity > 70 ? '#f59e0b' : '#2563EB' }}
                />
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-[#4b5563] mt-6">All branches · Admin access</p>
      </div>
    </div>
  );
}
