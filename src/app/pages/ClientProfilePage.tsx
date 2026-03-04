import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Phone, Mail, Calendar, DollarSign, Scissors,
  Star, CreditCard, Crown, MessageSquare, Award, Edit3,
  Clock, CheckCircle, Pencil, Save, X, Plus, Trash2, Shield
} from 'lucide-react';
import { mockClients } from '../data/mockData';
import { toast } from 'sonner';

const visitHistory = [
  { date: 'Mar 1, 2026', service: 'Premium Cut + Beard', barber: 'Jordan Blake', price: 85, status: 'completed' },
  { date: 'Feb 15, 2026', service: 'Master Fade', barber: 'Jordan Blake', price: 65, status: 'completed' },
  { date: 'Feb 1, 2026', service: 'Classic Cut', barber: 'Alex Torres', price: 45, status: 'completed' },
  { date: 'Jan 18, 2026', service: 'Premium Cut + Beard', barber: 'Jordan Blake', price: 85, status: 'completed' },
  { date: 'Jan 5, 2026', service: 'Beard Sculpt', barber: 'Jordan Blake', price: 50, status: 'completed' },
  { date: 'Dec 22, 2025', service: 'Full Service', barber: 'Alex Torres', price: 120, status: 'completed' },
];

const tabs = ['Overview', 'History', 'Notes', 'Membership'];

const membershipTiers = ['None', 'Basic', 'Premium', 'VIP'] as const;
type MembershipTier = typeof membershipTiers[number];

const defaultBenefits: Record<MembershipTier, string[]> = {
  None: [],
  Basic: ['10% off products', 'Birthday reward'],
  Premium: ['Unlimited cuts', 'Priority booking', '20% off products'],
  VIP: ['Unlimited cuts', 'Priority booking', '30% off products', 'Free beard trim monthly', 'VIP lounge access'],
};

export function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [note, setNote] = useState('');

  const client = mockClients.find(c => c.id === id) || mockClients[0];

  // Membership edit state
  const [editingMembership, setEditingMembership] = useState(false);
  const [membership, setMembership] = useState<MembershipTier>((client.membership as MembershipTier) || 'None');
  const [benefits, setBenefits] = useState<string[]>(defaultBenefits[(client.membership as MembershipTier)] || []);
  const [newBenefit, setNewBenefit] = useState('');
  const [renewalDate, setRenewalDate] = useState('2026-04-01');

  const handleMembershipSave = () => {
    setEditingMembership(false);
    toast.success(`Membership updated to ${membership}`);
  };
  const handleMembershipCancel = () => {
    setMembership((client.membership as MembershipTier) || 'None');
    setBenefits(defaultBenefits[(client.membership as MembershipTier)] || []);
    setEditingMembership(false);
  };
  const addBenefit = () => {
    const val = newBenefit.trim();
    if (!val) return;
    setBenefits(prev => [...prev, val]);
    setNewBenefit('');
  };
  const removeBenefit = (idx: number) => setBenefits(prev => prev.filter((_, i) => i !== idx));

  const loyaltyColors: Record<string, { color: string; bg: string }> = {
    Platinum: { color: '#e5e7eb', bg: 'rgba(229,231,235,0.1)' },
    Gold: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    Silver: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    Bronze: { color: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  };
  const lc = loyaltyColors[client.loyalty] || loyaltyColors.Bronze;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-[#6b7280] hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      {/* Profile Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))' }} />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between mb-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl text-white" style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)', border: '3px solid #1a1a1a', fontWeight: 800 }}>
              {client.avatar}
            </div>
            <div className="flex gap-2 mt-10">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Phone size={13} /> Call
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MessageSquare size={13} /> SMS
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-all">
                <Calendar size={13} /> Book
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-white text-2xl mb-1" style={{ fontWeight: 700 }}>{client.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-[#6b7280] text-sm"><Phone size={13} />{client.phone}</span>
                <span className="flex items-center gap-1.5 text-[#6b7280] text-sm"><Mail size={13} />{client.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background: lc.bg, color: lc.color, fontWeight: 600 }}>
                <Crown size={12} />{client.loyalty}
              </span>
              {client.membership !== 'None' && (
                <span className="px-3 py-1.5 rounded-xl text-xs text-[#2563EB]" style={{ background: 'rgba(37,99,235,0.1)', fontWeight: 600 }}>
                  {client.membership} Member
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Total Visits', value: client.visits, icon: Scissors, color: '#2563EB' },
              { label: 'Lifetime Spend', value: `$${client.spend.toLocaleString()}`, icon: DollarSign, color: '#10b981' },
              { label: 'Preferred Barber', value: client.barber.split(' ')[0], icon: Star, color: '#f59e0b' },
              { label: 'Last Visit', value: 'Mar 1', icon: Calendar, color: '#8b5cf6' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex justify-center mb-1.5">
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
                <div className="text-white text-sm" style={{ fontWeight: 700 }}>{stat.value}</div>
                <div className="text-[#4b5563] text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 rounded-lg text-xs transition-all"
            style={{
              background: activeTab === tab ? '#2563EB' : 'transparent',
              color: activeTab === tab ? '#fff' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Spending trend */}
          <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Recent Activity</h3>
            <div className="space-y-3">
              {visitHistory.slice(0, 4).map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#10b981]/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs" style={{ fontWeight: 500 }}>{v.service}</div>
                    <div className="text-[#4b5563] text-xs">{v.date} · {v.barber.split(' ')[0]}</div>
                  </div>
                  <span className="text-white text-sm" style={{ fontWeight: 700 }}>${v.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Cards */}
          <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Saved Payment Methods</h3>
              <button className="text-xs text-[#2563EB]">+ Add</button>
            </div>
            <div className="space-y-2">
              {[
                { type: 'Visa', last4: '4242', exp: '12/27', default: true },
                { type: 'Mastercard', last4: '8888', exp: '06/26', default: false },
              ].map((card, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                    <CreditCard size={14} className="text-[#2563EB]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-xs" style={{ fontWeight: 500 }}>{card.type} •••• {card.last4}</div>
                    <div className="text-[#4b5563] text-xs">Exp {card.exp}</div>
                  </div>
                  {card.default && (
                    <span className="text-xs px-2 py-0.5 rounded-lg text-[#10b981]" style={{ background: 'rgba(16,185,129,0.1)' }}>Default</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'History' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {visitHistory.map((v, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center flex-shrink-0 w-14">
                  <div className="text-white text-xs" style={{ fontWeight: 600 }}>{v.date.split(',')[0]}</div>
                  <div className="text-[#4b5563] text-xs">{v.date.split(' ')[1]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm" style={{ fontWeight: 500 }}>{v.service}</div>
                  <div className="text-[#6b7280] text-xs flex items-center gap-1.5 mt-0.5">
                    <Scissors size={11} /> {v.barber}
                  </div>
                </div>
                <div className="text-white text-sm flex-shrink-0" style={{ fontWeight: 700 }}>${v.price}</div>
                <span className="text-xs px-2.5 py-1 rounded-lg text-[#10b981]" style={{ background: 'rgba(16,185,129,0.1)' }}>Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Notes' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Edit3 size={14} className="text-[#6b7280]" />
              <span className="text-white text-sm" style={{ fontWeight: 600 }}>Barber Notes</span>
            </div>
            <div className="space-y-2 mb-3">
              {['Prefers tight fade on sides, 1.5 guard', 'Always asks for edge up on hairline', 'Allergic to certain pomades — use organic products only'].map((n, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-[#d1d5db]">{n}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
              />
              <button className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all" style={{ fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Membership' && (
        <div className="space-y-4">
          {/* Membership Card */}
          <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))', border: '1px solid rgba(37,99,235,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-[#f59e0b]" />
                <h3 className="text-white text-base" style={{ fontWeight: 700 }}>
                  {editingMembership ? 'Edit Membership' : `${membership} Membership`}
                </h3>
              </div>
              {!editingMembership ? (
                <div className="flex items-center gap-2">
                  {membership !== 'None' && (
                    <span className="text-xs px-2.5 py-1 rounded-lg text-[#10b981]" style={{ background: 'rgba(16,185,129,0.1)', fontWeight: 600 }}>Active</span>
                  )}
                  <button
                    onClick={() => setEditingMembership(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleMembershipSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-all" style={{ fontWeight: 600 }}>
                    <Save size={11} /> Save
                  </button>
                  <button onClick={handleMembershipCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Tier selector (edit mode) */}
            {editingMembership && (
              <div className="mb-4">
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>MEMBERSHIP TIER</label>
                <div className="grid grid-cols-4 gap-2">
                  {membershipTiers.map(tier => {
                    const tierColors: Record<string, string> = { None: '#6b7280', Basic: '#9ca3af', Premium: '#2563EB', VIP: '#f59e0b' };
                    return (
                      <button
                        key={tier}
                        onClick={() => { setMembership(tier); setBenefits(defaultBenefits[tier]); }}
                        className="py-2.5 rounded-xl text-xs transition-all"
                        style={{
                          background: membership === tier ? `${tierColors[tier]}20` : 'rgba(255,255,255,0.04)',
                          border: membership === tier ? `1px solid ${tierColors[tier]}60` : '1px solid rgba(255,255,255,0.07)',
                          color: membership === tier ? tierColors[tier] : '#6b7280',
                          fontWeight: membership === tier ? 700 : 400,
                        }}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Benefits list */}
            {membership !== 'None' && (
              <>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>BENEFITS</label>
                <div className="space-y-2 mb-3">
                  {benefits.length === 0 && !editingMembership && (
                    <p className="text-xs text-[#4b5563] italic">No benefits defined.</p>
                  )}
                  {benefits.map((perk, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
                      {editingMembership ? (
                        <>
                          <input
                            value={perk}
                            onChange={e => setBenefits(prev => prev.map((b, i) => i === idx ? e.target.value : b))}
                            className="flex-1 bg-transparent text-xs text-white outline-none placeholder-[#3f3f46]"
                          />
                          <button onClick={() => removeBenefit(idx)} className="text-[#ef4444] hover:text-red-300 flex-shrink-0 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[#d1d5db] flex-1">{perk}</span>
                      )}
                    </div>
                  ))}
                </div>
                {editingMembership && (
                  <div className="flex gap-2">
                    <input
                      value={newBenefit}
                      onChange={e => setNewBenefit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addBenefit()}
                      placeholder="Add benefit (e.g. Free beard trim)"
                      className="flex-1 bg-[#111111] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                    />
                    <button onClick={addBenefit} className="px-3 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs transition-all" style={{ fontWeight: 600 }}>
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Renewal date */}
            <div className="mt-4 flex items-center justify-between text-sm" style={{ borderTop: benefits.length > 0 || membership === 'None' ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: '12px', marginTop: '12px' }}>
              <span className="text-[#6b7280]">Renewal date</span>
              {editingMembership ? (
                <input
                  type="date"
                  value={renewalDate}
                  onChange={e => setRenewalDate(e.target.value)}
                  className="bg-[#111111] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#2563EB]/50 transition-all"
                />
              ) : (
                <span className="text-white" style={{ fontWeight: 600 }}>
                  {renewalDate ? new Date(renewalDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Loyalty Points */}
          <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Loyalty Points</h3>
              <span className="text-xl text-[#f59e0b]" style={{ fontWeight: 800 }}>2,840 pts</span>
            </div>
            <div className="h-2 bg-[#222222] rounded-full mb-2">
              <div className="h-full rounded-full" style={{ width: '71%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
            </div>
            <div className="flex justify-between text-xs text-[#4b5563]">
              <span>2,840 / 4,000 pts to Platinum</span>
              <span>1,160 pts needed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
