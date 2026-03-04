import { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, Mail, Plus, TrendingUp, Users,
  Send, Clock, X, Percent, Zap,
  BarChart2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createCampaign,
  getCampaigns,
  getClients,
  getSettings,
  saveSettings,
  type UiCampaign,
  type UiClient,
} from '../lib/supabaseData';
import { useBranchStore } from '../store/useBranchStore';

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Completed: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  Draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  Scheduled: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

const audienceOptions = ['All Clients', 'VIP Members', 'Gold & Platinum', 'Inactive 30 Days', 'New Clients'];

export function MarketingPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [campaignType, setCampaignType] = useState<'SMS' | 'Email'>('SMS');
  const [sendMode, setSendMode] = useState<'Send Now' | 'Schedule'>('Send Now');
  const [audience, setAudience] = useState('All Clients');
  const [message, setMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [campaigns, setCampaigns] = useState<UiCampaign[]>([]);
  const [clients, setClients] = useState<UiClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  const loadMarketingData = async () => {
    setIsLoading(true);
    try {
      const [campaignRows, clientRows] = await Promise.all([
        getCampaigns(activeBranchId),
        getClients(activeBranchId),
      ]);
      setCampaigns(campaignRows);
      setClients(clientRows);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to load marketing data';
      toast.error(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMarketingData();
  }, [activeBranchId]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const parseClientDate = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return new Date(0);
  };

  const audienceSegments = useMemo(() => {
    const vipMembers = clients.filter(client => String(client.membership || '').toLowerCase() !== 'none');
    const goldAndPlatinum = clients.filter(client => {
      const tier = String(client.loyalty || '').toLowerCase();
      return tier === 'gold' || tier === 'platinum';
    });
    const inactiveThirtyDays = clients.filter(client => parseClientDate(client.lastVisit) < thirtyDaysAgo);
    const newClientsThirtyDays = clients.filter(client => parseClientDate(client.lastVisit) >= thirtyDaysAgo);

    return [
      { label: 'All Clients', count: clients.length, icon: Users, color: '#2563EB' },
      { label: 'VIP Members', count: vipMembers.length, icon: Zap, color: '#f59e0b' },
      { label: 'Gold & Above', count: goldAndPlatinum.length, icon: TrendingUp, color: '#f59e0b' },
      { label: 'Inactive 30d', count: inactiveThirtyDays.length, icon: Clock, color: '#f59e0b' },
      { label: 'New (30d)', count: newClientsThirtyDays.length, icon: Plus, color: '#10b981' },
    ];
  }, [clients]);

  const totalSent = campaigns.reduce((sum, campaign) => sum + campaign.sent, 0);
  const totalOpened = campaigns.reduce((sum, campaign) => sum + campaign.opened, 0);
  const totalConverted = campaigns.reduce((sum, campaign) => sum + campaign.converted, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const conversionRate = totalOpened > 0 ? (totalConverted / totalOpened) * 100 : 0;

  const handleLaunchCampaign = async () => {
    if (!message.trim()) {
      toast.error('Campaign message is required');
      return;
    }

    setIsSubmittingCampaign(true);
    try {
      await createCampaign({
        branch_id: activeBranchId,
        name: `${campaignType} Campaign - ${audience}`,
        type: campaignType,
        audience,
        message: message.trim(),
        status: sendMode === 'Send Now' ? 'Active' : 'Scheduled',
      });
      await loadMarketingData();
      setShowCampaignModal(false);
      setMessage('');
      setSendMode('Send Now');
      toast.success('Campaign launched successfully');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to launch campaign';
      toast.error(messageText);
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const handleCreatePromoCode = async () => {
    const code = (promoCode || `LUXE${promoDiscount}`).trim().toUpperCase();
    if (!code) {
      toast.error('Promo code is required');
      return;
    }

    const discount = Number(promoDiscount);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      toast.error('Promo discount must be between 1 and 100');
      return;
    }

    setIsSubmittingPromo(true);
    try {
      const currentSettings = await getSettings(activeBranchId);
      const existingPromos = Array.isArray(currentSettings.marketingPromos)
        ? currentSettings.marketingPromos
        : [];
      const nextPromos = [
        { code, discount, createdAt: new Date().toISOString() },
        ...existingPromos.filter((promo: any) => String(promo.code).toUpperCase() !== code),
      ];

      await saveSettings(activeBranchId, {
        ...currentSettings,
        marketingPromos: nextPromos,
      });

      setShowPromoModal(false);
      setPromoCode('');
      toast.success(`Promo code ${code} created`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to save promo code';
      toast.error(messageText);
    } finally {
      setIsSubmittingPromo(false);
    }
  };

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
          { label: 'Total Sent', value: totalSent.toString(), sub: 'This month', color: '#2563EB', icon: Send },
          { label: 'Open Rate', value: `${openRate.toFixed(1)}%`, sub: `${totalOpened} opens`, color: '#10b981', icon: Eye },
          { label: 'Conversions', value: totalConverted.toString(), sub: `${conversionRate.toFixed(1)}% rate`, color: '#8b5cf6', icon: TrendingUp },
          { label: 'Revenue Generated', value: `$${totalRevenue.toLocaleString()}`, sub: 'From campaigns', color: '#f59e0b', icon: BarChart2 },
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
          {audienceSegments.map(seg => (
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
        {isLoading && <div className="text-sm text-[#9ca3af] mb-2">Loading campaigns...</div>}
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const sc = statusConfig[campaign.status] || statusConfig.Draft;
            const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(0) : '—';
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
                      onClick={() => setSendMode(opt as 'Send Now' | 'Schedule')}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-[#9ca3af] hover:text-white transition-all"
                      style={{
                        background: sendMode === opt ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                        border: sendMode === opt ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        color: sendMode === opt ? '#2563EB' : '#9ca3af',
                      }}
                    >
                      {opt === 'Send Now' ? <Send size={14} /> : <Clock size={14} />}
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLaunchCampaign}
                disabled={isSubmittingCampaign}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                <Send size={15} /> {isSubmittingCampaign ? 'Launching...' : 'Launch Campaign'}
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
                onClick={handleCreatePromoCode}
                disabled={isSubmittingPromo}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                {isSubmittingPromo ? 'Creating...' : 'Create Promo Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
