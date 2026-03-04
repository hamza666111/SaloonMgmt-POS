import { useState } from 'react';
import {
  MessageSquare, Mail, Plus, TrendingUp, Users,
  Send, Clock, CheckCircle, X, Percent, Zap,
  ChevronRight, BarChart2, Eye
} from 'lucide-react';
import { mockCampaigns } from '../data/mockData';
import { toast } from 'sonner';

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Completed: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  Draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  Scheduled: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

const audienceOptions = ['All Clients', 'VIP Members', 'Gold & Platinum', 'Inactive 30 Days', 'New Clients'];

export function MarketingPage() {
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [campaignType, setCampaignType] = useState<'SMS' | 'Email'>('SMS');
  const [audience, setAudience] = useState('All Clients');
  const [message, setMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Marketing</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Campaigns, promos, and client outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
          >
            <Percent size={15} /> Promo Code
          </button>
          <button
            onClick={() => setShowCampaignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
            style={{ fontWeight: 600 }}
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Sent', value: '412', sub: 'This month', color: '#2563EB', icon: Send },
          { label: 'Open Rate', value: '68.4%', sub: '+12% vs last month', color: '#10b981', icon: Eye },
          { label: 'Conversions', value: '111', sub: '26.9% rate', color: '#8b5cf6', icon: TrendingUp },
          { label: 'Revenue Generated', value: '$8,630', sub: 'From campaigns', color: '#f59e0b', icon: BarChart2 },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}18` }}>
                <stat.icon size={15} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-xl mb-0.5" style={{ fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div className="text-white text-xs" style={{ fontWeight: 500 }}>{stat.label}</div>
            <div className="text-[#4b5563] text-xs">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Audience Segments */}
      <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Audience Segments</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'All Clients', count: '8', icon: Users, color: '#2563EB' },
            { label: 'VIP Members', count: '2', icon: Zap, color: '#f59e0b' },
            { label: 'Gold & Above', count: '3', icon: TrendingUp, color: '#f59e0b' },
            { label: 'Inactive 30d', count: '2', icon: Clock, color: '#f59e0b' },
            { label: 'New (30d)', count: '3', icon: Plus, color: '#10b981' },
          ].map(seg => (
            <button
              key={seg.label}
              onClick={() => { setAudience(seg.label); setShowCampaignModal(true); }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-[#222222] transition-all group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${seg.color}15` }}>
                <seg.icon size={18} style={{ color: seg.color }} />
              </div>
              <div className="text-white text-lg" style={{ fontWeight: 700 }}>{seg.count}</div>
              <div className="text-xs text-[#6b7280] text-center">{seg.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns */}
      <div>
        <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Campaigns</h3>
        <div className="space-y-3">
          {mockCampaigns.map(campaign => {
            const sc = statusConfig[campaign.status];
            const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(0) : '—';
            const convRate = campaign.opened > 0 ? ((campaign.converted / campaign.opened) * 100).toFixed(0) : '—';
            return (
              <div
                key={campaign.id}
                className="p-5 rounded-2xl hover:bg-[#1f1f1f] transition-all"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${campaign.type === 'SMS' ? 'bg-[#8b5cf6]/10' : 'bg-[#2563EB]/10'}`}>
                      {campaign.type === 'SMS' ? <MessageSquare size={16} className="text-[#8b5cf6]" /> : <Mail size={16} className="text-[#2563EB]" />}
                    </div>
                    <div>
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>{campaign.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#6b7280]">{campaign.type}</span>
                        <span className="text-[#3f3f46]">·</span>
                        <span className="text-xs text-[#6b7280]">{campaign.audience}</span>
                        <span className="text-[#3f3f46]">·</span>
                        <span className="text-xs text-[#6b7280]">{campaign.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs" style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}>
                    {campaign.status}
                  </span>
                </div>

                {campaign.sent > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Sent', value: campaign.sent.toString() },
                      { label: 'Opened', value: campaign.opened.toString() },
                      { label: 'Open Rate', value: `${openRate}%` },
                      { label: 'Revenue', value: `$${campaign.revenue.toLocaleString()}` },
                    ].map(stat => (
                      <div key={stat.label} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-white text-sm" style={{ fontWeight: 700 }}>{stat.value}</div>
                        <div className="text-[#4b5563] text-xs">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar for active */}
                {campaign.status === 'Active' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-[#6b7280] mb-1.5">
                      <span>Open rate</span>
                      <span>{openRate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${openRate}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Builder Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCampaignModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl z-10 overflow-hidden max-h-[90vh] overflow-y-auto" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Campaign Builder</h3>
              <button onClick={() => setShowCampaignModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Type */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-3 block" style={{ letterSpacing: '0.05em' }}>CAMPAIGN TYPE</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['SMS', 'Email'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setCampaignType(type)}
                      className="flex items-center gap-3 p-4 rounded-xl transition-all"
                      style={{
                        background: campaignType === type ? `rgba(${type === 'SMS' ? '139,92,246' : '37,99,235'},0.1)` : 'rgba(255,255,255,0.03)',
                        border: campaignType === type ? `1px solid rgba(${type === 'SMS' ? '139,92,246' : '37,99,235'},0.4)` : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: campaignType === type ? (type === 'SMS' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)') : 'rgba(255,255,255,0.04)' }}>
                        {type === 'SMS' ? <MessageSquare size={16} style={{ color: campaignType === type ? '#8b5cf6' : '#6b7280' }} /> : <Mail size={16} style={{ color: campaignType === type ? '#2563EB' : '#6b7280' }} />}
                      </div>
                      <span className="text-sm" style={{ color: campaignType === type ? '#fff' : '#9ca3af', fontWeight: campaignType === type ? 600 : 400 }}>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-3 block" style={{ letterSpacing: '0.05em' }}>TARGET AUDIENCE</label>
                <div className="flex flex-wrap gap-2">
                  {audienceOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAudience(opt)}
                      className="px-3 py-1.5 rounded-xl text-xs transition-all"
                      style={{
                        background: audience === opt ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                        color: audience === opt ? '#2563EB' : '#6b7280',
                        border: audience === opt ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        fontWeight: audience === opt ? 600 : 400,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>MESSAGE</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={campaignType === 'SMS'
                    ? "Hey {first_name}! Book your next cut at LuxeCut and get 15% off this week. Use code LUXE15. Book now: luxecut.com/book"
                    : "Subject: Exclusive offer just for you...\n\nBody: Dear {first_name}..."}
                  rows={4}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all resize-none"
                />
                {campaignType === 'SMS' && message.length > 0 && (
                  <div className="flex justify-between mt-1.5 text-xs text-[#4b5563]">
                    <span>{message.length} chars</span>
                    <span>{Math.ceil(message.length / 160)} SMS segment{message.length > 160 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>SEND</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Send Now', 'Schedule'].map(opt => (
                    <button
                      key={opt}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-[#9ca3af] hover:text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {opt === 'Send Now' ? <Send size={14} /> : <Clock size={14} />}
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { toast.success('Campaign launched successfully'); setShowCampaignModal(false); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
                style={{ fontWeight: 600 }}
              >
                <Send size={15} /> Launch Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromoModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Create Promo Code</h3>
              <button onClick={() => setShowPromoModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>PROMO CODE</label>
                <input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="LUXE20"
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all tracking-widest"
                  style={{ fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>DISCOUNT</label>
                <div className="flex gap-2">
                  {['5', '10', '15', '20', '25'].map(d => (
                    <button
                      key={d}
                      onClick={() => setPromoDiscount(d)}
                      className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: promoDiscount === d ? '#2563EB' : 'rgba(255,255,255,0.04)',
                        color: promoDiscount === d ? '#fff' : '#6b7280',
                        fontWeight: promoDiscount === d ? 700 : 400,
                      }}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { toast.success(`Promo code ${promoCode || 'LUXE' + promoDiscount} created`); setShowPromoModal(false); }}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
                style={{ fontWeight: 600 }}
              >
                Create Promo Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
