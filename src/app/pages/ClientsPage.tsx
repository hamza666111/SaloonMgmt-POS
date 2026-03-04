import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Plus, Filter, ChevronRight, Star,
  Phone, Mail, Crown, Shield, Award, X, User,
  Trash2, ToggleLeft, ToggleRight, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient as createClientRecord, getClients, updateClient, deleteClient } from '../lib/supabaseData';
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
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const handleToggleActive = async (e: React.MouseEvent, clientId: string, currentlyActive: boolean) => {
    e.stopPropagation();
    setActionMenuId(null);
    try {
      const newStatus = currentlyActive ? 'inactive' : 'active';
      // We store active state as membership change or a dedicated field.
      // Using a simple approach: set loyalty to 'Inactive' or restore to 'Bronze'
      await updateClient(clientId, { membership: currentlyActive ? 'Inactive' : 'None' });
      toast.success(currentlyActive ? 'Client deactivated' : 'Client activated');
      await loadClients();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update client';
      toast.error(message);
    }
  };

  const handleDeleteClient = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setActionMenuId(null);
    setConfirmDeleteId(null);
    try {
      await deleteClient(clientId);
      toast.success('Client removed');
      await loadClients();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove client';
      toast.error(message);
    }
  };

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const rows = await getClients(activeBranchId);
      setClients(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load clients';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, [activeBranchId]);

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuId) return;
    const handler = () => { setActionMenuId(null); setConfirmDeleteId(null); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [actionMenuId]);

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const branchId = isAdmin ? (newClient.branchId || activeBranchId) : (user?.branchId || activeBranchId);

      await createClientRecord({
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        email: newClient.email?.trim() || undefined,
        branch_id: branchId,
      });

      toast.success('Client added successfully');
      setShowAddModal(false);
      setNewClient({ name: '', phone: '', email: '', branchId: activeBranchId });
      await loadClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchLoyalty = loyaltyFilter === 'All' || c.loyalty === loyaltyFilter;
    const matchMembership = membershipFilter === 'All' || c.membership === membershipFilter;
    return matchSearch && matchLoyalty && matchMembership;
  }), [clients, search, loyaltyFilter, membershipFilter]);

  const totalClients = clients.length;
  const vipMembers = clients.filter(client => client.membership === 'VIP').length;
  const avgLtv = totalClients > 0
    ? Math.round(clients.reduce((sum, client) => sum + (client.spend || 0), 0) / totalClients)
    : 0;
  const retentionRate = totalClients > 0
    ? Math.round((clients.filter(client => (client.visits || 0) > 1).length / totalClients) * 100)
    : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Clients</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{totalClients} total clients</p>
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
          { label: 'Total Clients', value: `${totalClients}`, sub: 'Active records', color: '#2563EB' },
          { label: 'VIP Members', value: `${vipMembers}`, sub: `${totalClients ? Math.round((vipMembers / totalClients) * 100) : 0}% of base`, color: '#f59e0b' },
          { label: 'Avg. Lifetime Value', value: `$${avgLtv.toLocaleString()}`, sub: 'Per client', color: '#10b981' },
          { label: 'Retention Rate', value: `${retentionRate}%`, sub: 'Returning clients', color: '#8b5cf6' },
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
          <div className="col-span-1 text-right">ACTIONS</div>
        </div>
        <div className="divide-y">
          {isLoading && (
            <div className="px-5 py-8 text-center text-[#6b7280] text-sm">Loading clients...</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-[#6b7280] text-sm">No clients found</div>
          )}
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
                  <span className={`text-xs ${client.membership === 'Inactive' ? 'text-red-400' : 'text-[#9ca3af]'}`} style={{ fontWeight: client.membership !== 'None' ? 500 : 400 }}>
                    {client.membership === 'Inactive' ? '⏸ Inactive' : client.membership}
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

                <div className="col-span-1 flex justify-end relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === client.id ? null : client.id); }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#6b7280] hover:text-white transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {actionMenuId === client.id && (
                    <div
                      className="absolute right-0 top-8 z-50 w-48 rounded-xl overflow-hidden shadow-xl"
                      style={{ background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <button
                        onClick={(e) => handleToggleActive(e, client.id, client.membership !== 'Inactive')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#d1d5db] hover:bg-white/[0.06] transition-all"
                      >
                        {client.membership === 'Inactive'
                          ? <><ToggleRight size={15} className="text-green-400" /> Activate</>
                          : <><ToggleLeft size={15} className="text-yellow-400" /> Deactivate</>}
                      </button>
                      {confirmDeleteId === client.id ? (
                        <button
                          onClick={(e) => handleDeleteClient(e, client.id)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-all font-semibold"
                        >
                          <Trash2 size={15} /> Confirm Remove
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(client.id); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <Trash2 size={15} /> Remove Client
                        </button>
                      )}
                    </div>
                  )}
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
                    {branches.map((branch: { id: string; name: string }) => (
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
