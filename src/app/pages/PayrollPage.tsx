import { useState } from 'react';
import {
  DollarSign, Download, Check, ChevronDown, TrendingUp,
  Calendar, AlertCircle, CheckCircle, Clock, Filter
} from 'lucide-react';
import { mockPayroll } from '../data/mockData';
import { toast } from 'sonner';

const staffColors = ['#2563EB', '#8b5cf6', '#10b981', '#f59e0b'];

export function PayrollPage() {
  const [period, setPeriod] = useState('Feb 16-28 2026');
  const [approving, setApproving] = useState<string | null>(null);
  const [approved, setApproved] = useState<string[]>(['3']);

  const totalPayout = mockPayroll.reduce((s, p) => s + p.netPayout, 0);
  const pendingCount = mockPayroll.filter(p => !approved.includes(p.id)).length;

  const handleApprove = async (id: string) => {
    setApproving(id);
    await new Promise(r => setTimeout(r, 800));
    setApproving(null);
    setApproved(prev => [...prev, id]);
    toast.success('Payroll approved and processed');
  };

  const handleExport = () => {
    toast.success('Payroll report exported to CSV');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Payroll</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Manage barber earnings and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all appearance-none"
            >
              {['Feb 16-28 2026', 'Feb 1-15 2026', 'Jan 16-31 2026', 'Jan 1-15 2026'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none" />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Payout', value: `$${totalPayout.toLocaleString()}`, sub: 'This period', color: '#2563EB', icon: DollarSign },
          { label: 'Pending Approval', value: pendingCount.toString(), sub: 'Barbers', color: '#f59e0b', icon: Clock },
          { label: 'Total Revenue', value: '$27,440', sub: 'Generated', color: '#10b981', icon: TrendingUp },
          { label: 'Avg Commission', value: '51.25%', sub: 'Across team', color: '#8b5cf6', icon: Filter },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.color}18` }}>
                <card.icon size={15} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-white text-xl mb-0.5" style={{ fontWeight: 700 }}>{card.value}</div>
            <div className="text-[#4b5563] text-xs">{card.label}</div>
            <div className="text-[#4b5563] text-xs">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Barber Earnings Breakdown</h3>
            <p className="text-[#4b5563] text-xs mt-0.5">{period}</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#f59e0b]" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle size={12} />
              {pendingCount} pending approval
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block">
          <div className="grid gap-0 px-5 py-3 text-xs text-[#4b5563]" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, letterSpacing: '0.05em' }}>
            <div>BARBER</div>
            <div>SERVICE REV.</div>
            <div>COMMISSION</div>
            <div>TIPS</div>
            <div>PRODUCTS</div>
            <div>BOOTH RENT</div>
            <div>NET PAYOUT</div>
            <div>STATUS</div>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {mockPayroll.map((row, idx) => {
              const isApproved = approved.includes(row.id);
              const isApproving = approving === row.id;
              return (
                <div key={row.id} className="grid items-center gap-0 px-5 py-4 hover:bg-white/[0.02] transition-all" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white" style={{ background: `${staffColors[idx]}20`, border: `1px solid ${staffColors[idx]}30`, fontWeight: 700 }}>
                      {row.barber.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>{row.barber}</div>
                    </div>
                  </div>
                  <div className="text-[#9ca3af] text-sm">${row.serviceRevenue.toLocaleString()}</div>
                  <div>
                    <div className="text-[#9ca3af] text-sm">${row.commissionEarned.toLocaleString()}</div>
                    <div className="text-[#4b5563] text-xs">{row.commission}%</div>
                  </div>
                  <div className="text-[#10b981] text-sm" style={{ fontWeight: 500 }}>+${row.tips}</div>
                  <div className="text-[#9ca3af] text-sm">${row.productCommission}</div>
                  <div className="text-[#9ca3af] text-sm">${row.boothRent}</div>
                  <div className="text-white text-sm" style={{ fontWeight: 700 }}>${row.netPayout.toLocaleString()}</div>
                  <div>
                    {isApproved ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#10b981] w-fit" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <CheckCircle size={12} /> Approved
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApprove(row.id)}
                        disabled={!!isApproving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-60 transition-all"
                        style={{ fontWeight: 600 }}
                      >
                        {isApproving ? <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" /> : <Check size={12} />}
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
          {mockPayroll.map((row, idx) => {
            const isApproved = approved.includes(row.id);
            return (
              <div key={row.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-white" style={{ background: `${staffColors[idx]}20`, fontWeight: 700 }}>
                      {row.barber.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-white text-sm" style={{ fontWeight: 700 }}>{row.barber}</div>
                      <div className="text-[#4b5563] text-xs">{row.commission}% commission</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-lg" style={{ fontWeight: 800 }}>${row.netPayout.toLocaleString()}</div>
                    <div className="text-[#4b5563] text-xs">Net payout</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Services', value: `$${row.serviceRevenue.toLocaleString()}` },
                    { label: 'Commission', value: `$${row.commissionEarned.toLocaleString()}` },
                    { label: 'Tips', value: `$${row.tips}` },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-white text-sm" style={{ fontWeight: 700 }}>{s.value}</div>
                      <div className="text-[#4b5563] text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
                {!isApproved ? (
                  <button
                    onClick={() => handleApprove(row.id)}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
                    style={{ fontWeight: 600 }}
                  >
                    Approve Payout
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-[#10b981]" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <CheckCircle size={14} /> Approved
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
