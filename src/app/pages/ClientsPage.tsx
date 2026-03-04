import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Plus, Filter, ChevronRight, Star,
  Phone, Mail, Crown, Shield, Award, X, User
} from 'lucide-react';
import { mockClients } from '../data/mockData';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchStore } from '../store/useBranchStore';

const loyaltyConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Platinum: { color: '#e5e7eb', bg: 'rgba(229,231,235,0.1)', icon: Crown },
  Gold: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Award },
  Silver: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', icon: Shield },
  Bronze: { color: '#b45309', bg: 'rgba(180,83,9,0.1)', icon: Star },
};

export function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { branches, activeBranchId } = useBranchStore();
  const [search, setSearch] = useState('');
  const [loyaltyFilter, setLoyaltyFilter] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', branchId: activeBranchId });
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Database not configured. Please add Supabase credentials to .env file');
      console.error('Supabase credentials missing. Update .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('clients').insert({
        full_name: newClient.name,
        phone: newClient.phone,
        email: newClient.email,
        branch_id: isAdmin ? newClient.branchId : user?.branchId,
      });

      if (error) throw error;

      toast.success('Client added successfully');
      setShowAddModal(false);
      setNewClient({ name: '', phone: '', email: '', branchId: activeBranchId });
      // Optionally refresh client list here
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = mockClients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchLoyalty = loyaltyFilter === 'All' || c.loyalty === loyaltyFilter;
    const matchMembership = membershipFilter === 'All' || c.membership === membershipFilter;
    return matchSearch && matchLoyalty && matchMembership;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Clients</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{mockClients.length} total clients</p>
        </div>
        <button
          onClick={() => {
            setNewClient({ name: '', phone: '', email: '', branchId: isAdmin ? activeBranchId : (user?.branchId || activeBranchId) });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
          style={{ fontWeight: 600 }}
        >
          <Plus size={16} /> New Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Clients', value: '8', sub: '+3 this month', color: '#2563EB' },
          { label: 'VIP Members', value: '2', sub: '25% of base', color: '#f59e0b' },
          { label: 'Avg. Lifetime Value', value: '$2,245', sub: 'Per client', color: '#10b981' },
          { label: 'Retention Rate', value: '87%', sub: '↑ 4% this month', color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-white text-xl mb-0.5" style={{ fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div className="text-white text-xs" style={{ fontWeight: 500 }}>{stat.label}</div>
            <div className="text-[#4b5563] text-xs mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:border-[#2563EB]/50 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['All', 'Platinum', 'Gold', 'Silver', 'Bronze'].map(l => (
              <button
                key={l}
                onClick={() => setLoyaltyFilter(l)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: loyaltyFilter === l ? '#2563EB' : 'transparent',
                  color: loyaltyFilter === l ? '#fff' : '#6b7280',
                  fontWeight: loyaltyFilter === l ? 600 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <select
            value={membershipFilter}
            onChange={e => setMembershipFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all"
          >
            {['All', 'VIP', 'Premium', 'Basic', 'None'].map(m => <option key={m} value={m}>{m === 'All' ? 'All Memberships' : m}</option>)}
          </select>
        </div>
      </div>

      {/* Client Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs text-[#4b5563]" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, letterSpacing: '0.05em' }}>
          <div className="col-span-3">CLIENT</div>
          <div className="col-span-2">CONTACT</div>
          <div className="col-span-2">LOYALTY</div>
          <div className="col-span-2">MEMBERSHIP</div>
          <div className="col-span-1">VISITS</div>
          <div className="col-span-1">LIFETIME VALUE</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
          {filtered.map(client => {
            const lConfig = loyaltyConfig[client.loyalty];
            return (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="grid md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-all items-center"
              >
                {/* Name + Avatar */}
                <div className="col-span-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, #2563EB20, #7c3aed20)`, border: '1px solid rgba(37,99,235,0.2)', fontWeight: 700 }}
                  >
                    {client.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{client.name}</div>
                    <div className="text-[#4b5563] text-xs">{client.barber}</div>
                  </div>
                </div>

                {/* Contact */}
                <div className="col-span-2 hidden md:block">
                  <div className="text-[#9ca3af] text-xs flex items-center gap-1.5"><Phone size={11} />{client.phone}</div>
                  <div className="text-[#4b5563] text-xs flex items-center gap-1.5 mt-0.5"><Mail size={11} />{client.email}</div>
                </div>

                {/* Loyalty */}
                <div className="col-span-2 hidden md:block">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: lConfig?.bg, color: lConfig?.color, fontWeight: 600 }}>
                    {lConfig && <lConfig.icon size={11} />}
                    {client.loyalty}
                  </span>
                </div>

                {/* Membership */}
                <div className="col-span-2 hidden md:block">
                  <span className="text-xs text-[#9ca3af]" style={{ fontWeight: client.membership !== 'None' ? 500 : 400 }}>
                    {client.membership}
                  </span>
                </div>

                {/* Visits */}
                <div className="col-span-1 hidden md:block">
                  <span className="text-white text-sm" style={{ fontWeight: 600 }}>{client.visits}</span>
                  <span className="text-[#4b5563] text-xs"> visits</span>
                </div>

                {/* Spend */}
                <div className="col-span-1 hidden md:block">
                  <span className="text-white text-sm" style={{ fontWeight: 700 }}>${client.spend.toLocaleString()}</span>
                </div>

                <div className="col-span-1 flex justify-end">
                  <ChevronRight size={16} className="text-[#4b5563]" />
                </div>

                {/* Mobile row info */}
                <div className="md:hidden flex items-center justify-between col-span-12">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: lConfig?.bg, color: lConfig?.color, fontWeight: 600 }}>
                      {client.loyalty}
                    </span>
                    <span className="text-[#6b7280] text-xs">{client.visits} visits</span>
                  </div>
                  <span className="text-white text-sm" style={{ fontWeight: 700 }}>${client.spend.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Add New Client</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'FULL NAME', field: 'name', placeholder: 'Marcus Williams', type: 'text', required: true },
                { label: 'PHONE', field: 'phone', placeholder: '+1 (555) 123-4567', type: 'tel', required: true },
                { label: 'EMAIL', field: 'email', placeholder: 'client@email.com', type: 'email', required: false },
              ].map(({ label, field, placeholder, type, required }) => (
                <div key={field}>
                  <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>
                    {label}{required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={type}
                    value={newClient[field as keyof typeof newClient]}
                    onChange={e => setNewClient({ ...newClient, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                  />
                </div>
              ))}
              
              {/* Branch Selector - Only for Admin */}
              {isAdmin && (
                <div>
                  <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>
                    BRANCH<span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={newClient.branchId}
                    onChange={e => setNewClient({ ...newClient, branchId: e.target.value })}
                    className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleAddClient}
                disabled={isSaving}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 600 }}
              >
                {isSaving ? 'Adding Client...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
