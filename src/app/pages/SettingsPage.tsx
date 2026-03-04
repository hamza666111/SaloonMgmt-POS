import { useEffect, useState } from 'react';
import {
  Building2, Receipt, Percent, Calendar, CreditCard,
  Palette, Save, ChevronRight, Globe, Clock, Phone,
  Mail, MapPin, Camera, Scissors, Check, Map, Award, Crown, Shield, Star, Plus, Trash2,
  Package, Pencil, Power, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranchStore } from '../store/useBranchStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  getSettings, saveSettings,
  getServices, createService, updateService, deleteService,
  getProducts, createProduct, updateProduct, deleteProduct,
  type UiService, type UiProduct,
} from '../lib/supabaseData';

const tabs = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'branches', label: 'Branches', icon: Map },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'tax', label: 'Tax Settings', icon: Receipt },
  { id: 'commission', label: 'Commission Rules', icon: Percent },
  { id: 'booking', label: 'Booking Rules', icon: Calendar },
  { id: 'payment', label: 'Payment Processor', icon: CreditCard },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'loyalty', label: 'Loyalty Status', icon: Award },
];

const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
  <div>
    <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
    />
  </div>
);

const Toggle = ({ label, desc, value, onChange }: any) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div>
      <div className="text-white text-sm" style={{ fontWeight: 500 }}>{label}</div>
      {desc && <div className="text-[#4b5563] text-xs mt-0.5">{desc}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
      style={{ background: value ? '#2563EB' : '#2a2a2a' }}
    >
      <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all" style={{ left: value ? '24px' : '4px' }} />
    </button>
  </div>
);

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const {
    businessInfo,
    updateBusinessInfo,
    receiptSettings,
    updateReceiptSettings,
    accentColor,
    updateAccentColor,
  } = useSettingsStore();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const [taxSettings, setTaxSettings] = useState({
    taxEnabled: true,
    taxOnServices: true,
    taxOnProducts: true,
    taxes: [
      { id: 'tax-1', name: 'NY Sales Tax', rate: '8.5' },
    ],
    serviceChargesEnabled: false,
    serviceCharges: [
      { id: 'charge-1', name: 'Service Fee', type: 'percent', value: '5', scope: 'services' },
    ],
  });
  const [commissionRules, setCommissionRules] = useState({
    defaultRate: '50',
    seniorRate: '55',
    masterRate: '60',
    productRate: '10',
    tipDistribution: 'barber',
  });
  const [bookingRules, setBookingRules] = useState({
    advanceBookingDays: '30',
    bufferTime: '10',
    depositRequired: false,
    depositAmount: '50',
    cancellationWindow: '24',
    noShowFee: false,
    maxDailyBookings: '20',
  });
  type LoyaltyTierConfig = {
    minVisits: string;
    minSpend: string;
    benefits: string[];
  };
  const [loyaltyTiers, setLoyaltyTiers] = useState<Record<string, LoyaltyTierConfig>>({
    Bronze:   { minVisits: '1',   minSpend: '0',    benefits: ['Birthday reward', '5% off products'] },
    Silver:   { minVisits: '10',  minSpend: '500',  benefits: ['10% off products', 'Priority SMS reminders'] },
    Gold:     { minVisits: '25',  minSpend: '1500', benefits: ['15% off products', 'Free add-on monthly', 'Priority booking'] },
    Platinum: { minVisits: '50',  minSpend: '3000', benefits: ['20% off products', 'Free service monthly', 'VIP lounge access', 'Dedicated barber'] },
  });
  const [newBenefitInputs, setNewBenefitInputs] = useState<Record<string, string>>({
    Bronze: '', Silver: '', Gold: '', Platinum: '',
  });
  const [paymentProcessors, setPaymentProcessors] = useState([
    { name: 'Stripe', desc: 'Credit/debit cards, tap to pay', active: true, color: '#6772e5' },
    { name: 'Square', desc: 'In-person and online payments', active: false, color: '#00d4aa' },
    { name: 'Cash', desc: 'Manual cash tracking', active: true, color: '#10b981' },
    { name: 'Gift Cards', desc: 'Branded gift card program', active: true, color: '#f59e0b' },
  ]);

  // ── Services state ──
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [servicesList, setServicesList] = useState<UiService[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '', category: '' });
  const [showAddService, setShowAddService] = useState(false);

  // ── Inventory state ──
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [productsList, setProductsList] = useState<UiProduct[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', category: '', sku: '', supplier: '', reorderLevel: '' });
  const [showAddProduct, setShowAddProduct] = useState(false);

  const tierMeta: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
    Bronze:   { color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.25)',    icon: Star,   label: 'Bronze' },
    Silver:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.25)', icon: Shield, label: 'Silver' },
    Gold:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: Award,  label: 'Gold' },
    Platinum: { color: '#e5e7eb', bg: 'rgba(229,231,235,0.08)', border: 'rgba(229,231,235,0.2)',  icon: Crown,  label: 'Platinum' },
  };

  const updateTier = (tier: string, field: keyof LoyaltyTierConfig, value: any) =>
    setLoyaltyTiers(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: value } }));

  const addTierBenefit = (tier: string) => {
    const val = newBenefitInputs[tier]?.trim();
    if (!val) return;
    updateTier(tier, 'benefits', [...loyaltyTiers[tier].benefits, val]);
    setNewBenefitInputs(prev => ({ ...prev, [tier]: '' }));
  };

  const removeTierBenefit = (tier: string, idx: number) =>
    updateTier(tier, 'benefits', loyaltyTiers[tier].benefits.filter((_: string, i: number) => i !== idx));

  const [saving, setSaving] = useState(false);
  const { branches, addBranch, updateBranch } = useBranchStore();

  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const settings = await getSettings(activeBranchId);
        if (!settings || typeof settings !== 'object') return;

        if (settings.businessInfo) {
          updateBusinessInfo(settings.businessInfo);
        }

        if (settings.receiptSettings) {
          updateReceiptSettings(settings.receiptSettings);
        }

        if (typeof settings.accentColor === 'string' && settings.accentColor) {
          updateAccentColor(settings.accentColor);
        }

        if (settings.taxSettings) {
          setTaxSettings(settings.taxSettings);
        }

        if (settings.commissionRules) {
          setCommissionRules(settings.commissionRules);
        }

        if (settings.bookingRules) {
          setBookingRules(settings.bookingRules);
        }

        if (settings.loyaltyTiers) {
          setLoyaltyTiers(settings.loyaltyTiers);
        }

        if (Array.isArray(settings.paymentProcessors)) {
          setPaymentProcessors(settings.paymentProcessors);
        }

        if (typeof settings.servicesEnabled === 'boolean') {
          setServicesEnabled(settings.servicesEnabled);
        }

        if (typeof settings.inventoryEnabled === 'boolean') {
          setInventoryEnabled(settings.inventoryEnabled);
        }
      } catch {
        toast.error('Failed to load branch settings');
      }
    };

    const loadServiceData = async () => {
      try {
        const [svcs, prods] = await Promise.all([
          getServices(activeBranchId),
          getProducts(activeBranchId),
        ]);
        setServicesList(svcs);
        setProductsList(prods);
      } catch {
        // fallback already handled inside data layer
      }
    };

    void loadSavedSettings();
    void loadServiceData();
  }, [activeBranchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(activeBranchId, {
        businessInfo,
        receiptSettings,
        accentColor,
        taxSettings,
        commissionRules,
        bookingRules,
        loyaltyTiers,
        paymentProcessors,
        servicesEnabled,
        inventoryEnabled,
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="flex flex-col md:flex-row h-full" style={{ background: '#111111' }}>
      {/* Sidebar tabs */}
      <div className="w-56 flex-shrink-0 p-4 space-y-1 hidden md:block" style={{ background: '#161616', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-3 py-2 mb-3">
          <h1 className="text-white text-base" style={{ fontWeight: 700 }}>Settings</h1>
          <p className="text-[#4b5563] text-xs mt-0.5">System configuration</p>
        </div>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
            style={{
              background: activeTab === tab.id ? 'rgba(37,99,235,0.1)' : 'transparent',
              color: activeTab === tab.id ? '#2563EB' : '#6b7280',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile tab selector */}
      <div className="md:hidden p-4 w-full flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white"
        >
          {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-2xl space-y-6">
          {activeTab === 'business' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Business Information</h2>
                <p className="text-[#6b7280] text-sm mb-6">Manage your shop's basic information</p>
              </div>

              {/* Logo Upload */}
              <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {businessInfo.logoDataUrl ? (
                    <img src={businessInfo.logoDataUrl} alt="Shop logo" className="w-full h-full object-contain" />
                  ) : (
                    <Scissors size={28} color="#fff" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>Business Logo</div>
                  <div className="text-[#6b7280] text-xs mb-2">PNG or SVG, recommended 512x512px</div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Camera size={12} /> Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = typeof reader.result === 'string' ? reader.result : '';
                            updateBusinessInfo({ logoDataUrl: result });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {businessInfo.logoDataUrl && (
                      <button
                        onClick={() => updateBusinessInfo({ logoDataUrl: '' })}
                        className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InputField label="BUSINESS NAME" value={businessInfo.name} onChange={(v: string) => updateBusinessInfo({ name: v })} />
                <InputField label="PHONE" value={businessInfo.phone} onChange={(v: string) => updateBusinessInfo({ phone: v })} type="tel" />
                <InputField label="EMAIL" value={businessInfo.email} onChange={(v: string) => updateBusinessInfo({ email: v })} type="email" />
                <InputField label="WEBSITE" value={businessInfo.website} onChange={(v: string) => updateBusinessInfo({ website: v })} />
              </div>
              <InputField label="ADDRESS" value={businessInfo.address} onChange={(v: string) => updateBusinessInfo({ address: v })} />
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>TIMEZONE</label>
                <select
                  value={businessInfo.timezone}
                  onChange={e => updateBusinessInfo({ timezone: e.target.value })}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                >
                  {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'].map(tz => (
                    <option key={tz} value={tz}>{tz.replace('America/', '').replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-white text-sm mb-2" style={{ fontWeight: 600 }}>Receipt Rating QR</h3>
                <p className="text-[#6b7280] text-xs mb-4">Add a QR code that links to your service rating page.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField
                    label="RATING URL"
                    value={receiptSettings.ratingUrl}
                    onChange={(v: string) => updateReceiptSettings({ ratingUrl: v })}
                    placeholder="https://your-site.com/rate"
                  />
                  <div>
                    <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>QR CODE IMAGE</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Camera size={12} /> Upload QR
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = typeof reader.result === 'string' ? reader.result : '';
                              updateReceiptSettings({ qrCodeDataUrl: result });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {receiptSettings.qrCodeDataUrl && (
                        <button
                          onClick={() => updateReceiptSettings({ qrCodeDataUrl: '' })}
                          className="px-3 py-2.5 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {receiptSettings.qrCodeDataUrl && (
                      <div className="mt-3 w-20 h-20 rounded-xl bg-white p-2">
                        <img src={receiptSettings.qrCodeDataUrl} alt="QR code" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

            {activeTab === 'branches' && (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Branch Management</h2>
                    <p className="text-[#6b7280] text-sm">Add, edit address/phone, and configure store locations</p>
                  </div>
                  <button 
                    onClick={() => {
                       const name = prompt("Enter new branch name:");
                       if (name) {
                         const address = prompt("Enter new branch address:");
                         addBranch({ name, address: address || '', isActive: true });
                         toast.success("Branch added");
                       }
                    }}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm font-medium transition-all"
                  >
                    + Add Branch
                  </button>
                </div>
                <div className="space-y-4">
                  {branches.map(branch => (
                    <div key={branch.id} className="p-5 rounded-xl border border-white/[0.08]" style={{ background: '#161616' }}>
                      <div className="flex justify-between items-start">
                        <div className="text-white text-sm font-semibold mb-3">{branch.name}</div>
                        <div className="flex items-center gap-3 w-48">
                          <Toggle 
                            label=""
                            value={branch.isActive}
                            onChange={(val: boolean) => updateBranch(branch.id, { isActive: val })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <InputField
                          label="Address"
                          value={branch.address || ''}
                          onChange={(val: string) => updateBranch(branch.id, { address: val })}
                          placeholder="123 Main St, City, State"
                        />
                        <InputField
                          label="Phone Number"
                          value={branch.phone || ''}
                          onChange={(val: string) => updateBranch(branch.id, { phone: val })}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          {activeTab === 'services' && (
            <>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Services</h2>
                  <p className="text-[#6b7280] text-sm">Add, edit, remove or disable salon services</p>
                </div>
              </div>

              <Toggle
                label="Enable Services"
                desc="Turn off to hide the services catalogue across the system"
                value={servicesEnabled}
                onChange={(v: boolean) => setServicesEnabled(v)}
              />

              {servicesEnabled && (
                <div className="space-y-4 mt-2">
                  {/* Add service button */}
                  {!showAddService && (
                    <button
                      onClick={() => { setShowAddService(true); setServiceForm({ name: '', price: '', duration: '', category: '' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white transition-all"
                      style={{ background: '#2563EB', fontWeight: 600 }}
                    >
                      <Plus size={15} /> Add Service
                    </button>
                  )}

                  {/* Add service form */}
                  {showAddService && (
                    <div className="p-5 rounded-2xl space-y-4" style={{ background: '#1a1a1a', border: '1px solid rgba(37,99,235,0.3)' }}>
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>New Service</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <InputField label="SERVICE NAME" value={serviceForm.name} onChange={(v: string) => setServiceForm(f => ({ ...f, name: v }))} placeholder="e.g. Classic Cut" />
                        <InputField label="PRICE ($)" value={serviceForm.price} onChange={(v: string) => setServiceForm(f => ({ ...f, price: v }))} type="number" placeholder="45" />
                        <InputField label="DURATION (MINS)" value={serviceForm.duration} onChange={(v: string) => setServiceForm(f => ({ ...f, duration: v }))} type="number" placeholder="30" />
                        <InputField label="CATEGORY" value={serviceForm.category} onChange={(v: string) => setServiceForm(f => ({ ...f, category: v }))} placeholder="Haircut" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!serviceForm.name.trim()) { toast.error('Service name is required'); return; }
                            try {
                              await createService({ name: serviceForm.name, price: serviceForm.price || '0', duration: serviceForm.duration || '30', category: serviceForm.category || 'General', branchId: activeBranchId });
                              const refreshed = await getServices(activeBranchId);
                              setServicesList(refreshed);
                              setShowAddService(false);
                              setServiceForm({ name: '', price: '', duration: '', category: '' });
                              toast.success('Service added');
                            } catch (err) { console.error(err); toast.error('Failed to add service'); }
                          }}
                          className="px-4 py-2 rounded-xl text-white text-sm transition-all" style={{ background: '#2563EB', fontWeight: 600 }}
                        >
                          Save
                        </button>
                        <button onClick={() => setShowAddService(false)} className="px-4 py-2 rounded-xl text-sm text-[#9ca3af] transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Services list */}
                  {servicesList.length === 0 && (
                    <div className="p-8 rounded-2xl text-center" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Scissors size={32} className="mx-auto mb-3 text-[#4b5563]" />
                      <p className="text-[#6b7280] text-sm">No services yet. Add your first service above.</p>
                    </div>
                  )}

                  {servicesList.map(svc => (
                    <div key={svc.id} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {editingServiceId === svc.id ? (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <InputField label="SERVICE NAME" value={serviceForm.name} onChange={(v: string) => setServiceForm(f => ({ ...f, name: v }))} />
                            <InputField label="PRICE ($)" value={serviceForm.price} onChange={(v: string) => setServiceForm(f => ({ ...f, price: v }))} type="number" />
                            <InputField label="DURATION (MINS)" value={serviceForm.duration} onChange={(v: string) => setServiceForm(f => ({ ...f, duration: v }))} type="number" />
                            <InputField label="CATEGORY" value={serviceForm.category} onChange={(v: string) => setServiceForm(f => ({ ...f, category: v }))} />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const updates: Partial<UiService> = {
                                    name: serviceForm.name,
                                    price: parseFloat(serviceForm.price) || svc.price,
                                    duration: parseInt(serviceForm.duration) || svc.duration,
                                    category: serviceForm.category || svc.category,
                                  };
                                  await updateService(svc.id, updates);
                                  setServicesList(prev => prev.map(s => s.id === svc.id ? { ...s, ...updates } : s));
                                  setEditingServiceId(null);
                                  toast.success('Service updated');
                                } catch { toast.error('Failed to update service'); }
                              }}
                              className="px-4 py-2 rounded-xl text-white text-sm transition-all" style={{ background: '#2563EB', fontWeight: 600 }}
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingServiceId(null)} className="px-4 py-2 rounded-xl text-sm text-[#9ca3af] transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
                              <Scissors size={16} style={{ color: '#2563EB' }} />
                            </div>
                            <div>
                              <div className="text-white text-sm" style={{ fontWeight: 600 }}>{svc.name}</div>
                              <div className="text-[#4b5563] text-xs">{svc.category} · {svc.duration} min · ${svc.price}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingServiceId(svc.id); setServiceForm({ name: svc.name, price: String(svc.price), duration: String(svc.duration), category: svc.category }); }}
                              className="p-2 rounded-xl text-[#9ca3af] hover:text-white transition-all"
                              style={{ background: 'rgba(255,255,255,0.06)' }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteService(svc.id);
                                  setServicesList(prev => prev.filter(s => s.id !== svc.id));
                                  toast.success('Service removed');
                                } catch { toast.error('Failed to remove service'); }
                              }}
                              className="p-2 rounded-xl text-red-400 hover:text-red-300 transition-all"
                              style={{ background: 'rgba(239,68,68,0.08)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!servicesEnabled && (
                <div className="p-5 rounded-xl flex gap-3 mt-2" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Power size={18} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white text-xs mb-0.5" style={{ fontWeight: 600 }}>Services Disabled</div>
                    <p className="text-[#6b7280] text-xs">The services catalogue is currently hidden. Re-enable it above to manage services.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Inventory</h2>
                  <p className="text-[#6b7280] text-sm">Add, edit, remove or disable product inventory</p>
                </div>
              </div>

              <Toggle
                label="Enable Inventory"
                desc="Turn off to hide inventory tracking across the system"
                value={inventoryEnabled}
                onChange={(v: boolean) => setInventoryEnabled(v)}
              />

              {inventoryEnabled && (
                <div className="space-y-4 mt-2">
                  {/* Add product button */}
                  {!showAddProduct && (
                    <button
                      onClick={() => { setShowAddProduct(true); setProductForm({ name: '', price: '', stock: '', category: '', sku: '', supplier: '', reorderLevel: '' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white transition-all"
                      style={{ background: '#2563EB', fontWeight: 600 }}
                    >
                      <Plus size={15} /> Add Product
                    </button>
                  )}

                  {/* Add product form */}
                  {showAddProduct && (
                    <div className="p-5 rounded-2xl space-y-4" style={{ background: '#1a1a1a', border: '1px solid rgba(37,99,235,0.3)' }}>
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>New Product</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <InputField label="PRODUCT NAME" value={productForm.name} onChange={(v: string) => setProductForm(f => ({ ...f, name: v }))} placeholder="e.g. Pomade - Strong Hold" />
                        <InputField label="PRICE ($)" value={productForm.price} onChange={(v: string) => setProductForm(f => ({ ...f, price: v }))} type="number" placeholder="24" />
                        <InputField label="STOCK" value={productForm.stock} onChange={(v: string) => setProductForm(f => ({ ...f, stock: v }))} type="number" placeholder="48" />
                        <InputField label="CATEGORY" value={productForm.category} onChange={(v: string) => setProductForm(f => ({ ...f, category: v }))} placeholder="Styling" />
                        <InputField label="SKU" value={productForm.sku} onChange={(v: string) => setProductForm(f => ({ ...f, sku: v }))} placeholder="STYLE-001" />
                        <InputField label="SUPPLIER" value={productForm.supplier} onChange={(v: string) => setProductForm(f => ({ ...f, supplier: v }))} placeholder="BarberCo" />
                      </div>
                      <InputField label="REORDER LEVEL" value={productForm.reorderLevel} onChange={(v: string) => setProductForm(f => ({ ...f, reorderLevel: v }))} type="number" placeholder="10" />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!productForm.name.trim()) { toast.error('Product name is required'); return; }
                            try {
                              await createProduct({ name: productForm.name, price: productForm.price || '0', stock: productForm.stock || '0', category: productForm.category || 'General', sku: productForm.sku, supplier: productForm.supplier, reorderLevel: productForm.reorderLevel, branchId: activeBranchId });
                              const refreshed = await getProducts(activeBranchId);
                              setProductsList(refreshed);
                              setShowAddProduct(false);
                              setProductForm({ name: '', price: '', stock: '', category: '', sku: '', supplier: '', reorderLevel: '' });
                              toast.success('Product added');
                            } catch (err) { console.error(err); toast.error('Failed to add product'); }
                          }}
                          className="px-4 py-2 rounded-xl text-white text-sm transition-all" style={{ background: '#2563EB', fontWeight: 600 }}
                        >
                          Save
                        </button>
                        <button onClick={() => setShowAddProduct(false)} className="px-4 py-2 rounded-xl text-sm text-[#9ca3af] transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Products list */}
                  {productsList.length === 0 && (
                    <div className="p-8 rounded-2xl text-center" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Package size={32} className="mx-auto mb-3 text-[#4b5563]" />
                      <p className="text-[#6b7280] text-sm">No products yet. Add your first product above.</p>
                    </div>
                  )}

                  {productsList.map(prod => (
                    <div key={prod.id} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {editingProductId === prod.id ? (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <InputField label="PRODUCT NAME" value={productForm.name} onChange={(v: string) => setProductForm(f => ({ ...f, name: v }))} />
                            <InputField label="PRICE ($)" value={productForm.price} onChange={(v: string) => setProductForm(f => ({ ...f, price: v }))} type="number" />
                            <InputField label="STOCK" value={productForm.stock} onChange={(v: string) => setProductForm(f => ({ ...f, stock: v }))} type="number" />
                            <InputField label="CATEGORY" value={productForm.category} onChange={(v: string) => setProductForm(f => ({ ...f, category: v }))} />
                            <InputField label="SKU" value={productForm.sku} onChange={(v: string) => setProductForm(f => ({ ...f, sku: v }))} />
                            <InputField label="SUPPLIER" value={productForm.supplier} onChange={(v: string) => setProductForm(f => ({ ...f, supplier: v }))} />
                          </div>
                          <InputField label="REORDER LEVEL" value={productForm.reorderLevel} onChange={(v: string) => setProductForm(f => ({ ...f, reorderLevel: v }))} type="number" />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const updates: Partial<UiProduct> = {
                                    name: productForm.name,
                                    price: parseFloat(productForm.price) || prod.price,
                                    stock: parseInt(productForm.stock) || prod.stock,
                                    category: productForm.category || prod.category,
                                    sku: productForm.sku || prod.sku,
                                    supplier: productForm.supplier || prod.supplier,
                                    reorderLevel: parseInt(productForm.reorderLevel) || prod.reorderLevel,
                                  };
                                  await updateProduct(prod.id, updates);
                                  setProductsList(prev => prev.map(p => p.id === prod.id ? { ...p, ...updates } : p));
                                  setEditingProductId(null);
                                  toast.success('Product updated');
                                } catch { toast.error('Failed to update product'); }
                              }}
                              className="px-4 py-2 rounded-xl text-white text-sm transition-all" style={{ background: '#2563EB', fontWeight: 600 }}
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingProductId(null)} className="px-4 py-2 rounded-xl text-sm text-[#9ca3af] transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                              <ShoppingBag size={16} style={{ color: '#10b981' }} />
                            </div>
                            <div>
                              <div className="text-white text-sm" style={{ fontWeight: 600 }}>{prod.name}</div>
                              <div className="text-[#4b5563] text-xs">{prod.category} · ${prod.price} · Stock: {prod.stock}{prod.sku ? ` · ${prod.sku}` : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingProductId(prod.id); setProductForm({ name: prod.name, price: String(prod.price), stock: String(prod.stock), category: prod.category, sku: prod.sku, supplier: prod.supplier, reorderLevel: String(prod.reorderLevel) }); }}
                              className="p-2 rounded-xl text-[#9ca3af] hover:text-white transition-all"
                              style={{ background: 'rgba(255,255,255,0.06)' }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteProduct(prod.id);
                                  setProductsList(prev => prev.filter(p => p.id !== prod.id));
                                  toast.success('Product removed');
                                } catch { toast.error('Failed to remove product'); }
                              }}
                              className="p-2 rounded-xl text-red-400 hover:text-red-300 transition-all"
                              style={{ background: 'rgba(239,68,68,0.08)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!inventoryEnabled && (
                <div className="p-5 rounded-xl flex gap-3 mt-2" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Power size={18} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white text-xs mb-0.5" style={{ fontWeight: 600 }}>Inventory Disabled</div>
                    <p className="text-[#6b7280] text-xs">Inventory tracking is currently hidden. Re-enable it above to manage products.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'tax' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Tax Settings</h2>
                <p className="text-[#6b7280] text-sm mb-6">Configure tax collection and reporting</p>
              </div>
              <div className="space-y-3">
                <Toggle label="Enable Tax Collection" desc="Automatically calculate and apply tax" value={taxSettings.taxEnabled} onChange={(v: boolean) => setTaxSettings({ ...taxSettings, taxEnabled: v })} />
                {taxSettings.taxEnabled && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-white text-sm" style={{ fontWeight: 600 }}>Taxes</div>
                        <button
                          onClick={() => setTaxSettings(prev => ({
                            ...prev,
                            taxes: [...prev.taxes, { id: createId('tax'), name: '', rate: '' }],
                          }))}
                          className="px-3 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          + Add Tax
                        </button>
                      </div>
                      <div className="space-y-2">
                        {taxSettings.taxes.map(tax => (
                          <div key={tax.id} className="grid md:grid-cols-[1fr_160px_auto] gap-3 items-end">
                            <InputField
                              label="TAX NAME"
                              value={tax.name}
                              onChange={(v: string) => setTaxSettings(prev => ({
                                ...prev,
                                taxes: prev.taxes.map(item => item.id === tax.id ? { ...item, name: v } : item),
                              }))}
                              placeholder="NY Sales Tax"
                            />
                            <InputField
                              label="RATE (%)"
                              value={tax.rate}
                              onChange={(v: string) => setTaxSettings(prev => ({
                                ...prev,
                                taxes: prev.taxes.map(item => item.id === tax.id ? { ...item, rate: v } : item),
                              }))}
                              type="number"
                              placeholder="8.5"
                            />
                            <button
                              onClick={() => setTaxSettings(prev => ({
                                ...prev,
                                taxes: prev.taxes.filter(item => item.id !== tax.id),
                              }))}
                              className="h-10 px-3 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Toggle label="Apply Tax to Services" value={taxSettings.taxOnServices} onChange={(v: boolean) => setTaxSettings({ ...taxSettings, taxOnServices: v })} />
                    <Toggle label="Apply Tax to Products" value={taxSettings.taxOnProducts} onChange={(v: boolean) => setTaxSettings({ ...taxSettings, taxOnProducts: v })} />
                  </>
                )}
                <Toggle
                  label="Enable Service Charges"
                  desc="Add extra service fees as fixed amounts or percentages"
                  value={taxSettings.serviceChargesEnabled}
                  onChange={(v: boolean) => setTaxSettings({ ...taxSettings, serviceChargesEnabled: v })}
                />
                {taxSettings.serviceChargesEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>Service Charges</div>
                      <button
                        onClick={() => setTaxSettings(prev => ({
                          ...prev,
                          serviceCharges: [...prev.serviceCharges, { id: createId('charge'), name: '', type: 'percent', value: '', scope: 'services' }],
                        }))}
                        className="px-3 py-1.5 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        + Add Charge
                      </button>
                    </div>
                    <div className="space-y-2">
                      {taxSettings.serviceCharges.map(charge => (
                        <div key={charge.id} className="grid md:grid-cols-[1fr_140px_140px_140px_auto] gap-3 items-end">
                          <InputField
                            label="CHARGE NAME"
                            value={charge.name}
                            onChange={(v: string) => setTaxSettings(prev => ({
                              ...prev,
                              serviceCharges: prev.serviceCharges.map(item => item.id === charge.id ? { ...item, name: v } : item),
                            }))}
                            placeholder="Service Fee"
                          />
                          <div>
                            <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>TYPE</label>
                            <select
                              value={charge.type}
                              onChange={e => setTaxSettings(prev => ({
                                ...prev,
                                serviceCharges: prev.serviceCharges.map(item => item.id === charge.id ? { ...item, type: e.target.value } : item),
                              }))}
                              className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                            >
                              <option value="percent">Percent</option>
                              <option value="amount">Amount</option>
                            </select>
                          </div>
                          <InputField
                            label={charge.type === 'amount' ? 'AMOUNT ($)' : 'RATE (%)'}
                            value={charge.value}
                            onChange={(v: string) => setTaxSettings(prev => ({
                              ...prev,
                              serviceCharges: prev.serviceCharges.map(item => item.id === charge.id ? { ...item, value: v } : item),
                            }))}
                            type="number"
                            placeholder={charge.type === 'amount' ? '5.00' : '10'}
                          />
                          <div>
                            <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>APPLY TO</label>
                            <select
                              value={charge.scope}
                              onChange={e => setTaxSettings(prev => ({
                                ...prev,
                                serviceCharges: prev.serviceCharges.map(item => item.id === charge.id ? { ...item, scope: e.target.value } : item),
                              }))}
                              className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                            >
                              <option value="services">Services</option>
                              <option value="products">Products</option>
                              <option value="both">Both</option>
                            </select>
                          </div>
                          <button
                            onClick={() => setTaxSettings(prev => ({
                              ...prev,
                              serviceCharges: prev.serviceCharges.filter(item => item.id !== charge.id),
                            }))}
                            className="h-10 px-3 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'commission' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Commission Rules</h2>
                <p className="text-[#6b7280] text-sm mb-6">Set commission rates by role</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <InputField label="BARBER DEFAULT (%)" value={commissionRules.defaultRate} onChange={(v: string) => setCommissionRules({ ...commissionRules, defaultRate: v })} type="number" />
                <InputField label="SENIOR BARBER (%)" value={commissionRules.seniorRate} onChange={(v: string) => setCommissionRules({ ...commissionRules, seniorRate: v })} type="number" />
                <InputField label="MASTER BARBER (%)" value={commissionRules.masterRate} onChange={(v: string) => setCommissionRules({ ...commissionRules, masterRate: v })} type="number" />
                <InputField label="PRODUCT SALES (%)" value={commissionRules.productRate} onChange={(v: string) => setCommissionRules({ ...commissionRules, productRate: v })} type="number" />
              </div>
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>TIP DISTRIBUTION</label>
                <div className="grid grid-cols-3 gap-2">
                  {['barber', 'split', 'pool'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setCommissionRules({ ...commissionRules, tipDistribution: opt })}
                      className="py-2.5 rounded-xl text-sm transition-all capitalize"
                      style={{
                        background: commissionRules.tipDistribution === opt ? '#2563EB' : 'rgba(255,255,255,0.04)',
                        color: commissionRules.tipDistribution === opt ? '#fff' : '#6b7280',
                        border: commissionRules.tipDistribution === opt ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.06)',
                        fontWeight: commissionRules.tipDistribution === opt ? 600 : 400,
                      }}
                    >
                      {opt === 'barber' ? 'To Barber' : opt === 'split' ? 'Split Evenly' : 'Tip Pool'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'booking' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Booking Rules</h2>
                <p className="text-[#6b7280] text-sm mb-6">Control how clients can book appointments</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <InputField label="ADVANCE BOOKING (DAYS)" value={bookingRules.advanceBookingDays} onChange={(v: string) => setBookingRules({ ...bookingRules, advanceBookingDays: v })} type="number" />
                <InputField label="BUFFER TIME (MINS)" value={bookingRules.bufferTime} onChange={(v: string) => setBookingRules({ ...bookingRules, bufferTime: v })} type="number" />
                <InputField label="MAX DAILY BOOKINGS" value={bookingRules.maxDailyBookings} onChange={(v: string) => setBookingRules({ ...bookingRules, maxDailyBookings: v })} type="number" />
                <InputField label="CANCELLATION WINDOW (HRS)" value={bookingRules.cancellationWindow} onChange={(v: string) => setBookingRules({ ...bookingRules, cancellationWindow: v })} type="number" />
              </div>
              <div className="space-y-3">
                <Toggle label="Require Deposit for Bookings" desc="Charge a percentage upfront" value={bookingRules.depositRequired} onChange={(v: boolean) => setBookingRules({ ...bookingRules, depositRequired: v })} />
                {bookingRules.depositRequired && (
                  <InputField label="DEPOSIT AMOUNT (%)" value={bookingRules.depositAmount} onChange={(v: string) => setBookingRules({ ...bookingRules, depositAmount: v })} type="number" placeholder="50" />
                )}
                <Toggle label="Charge No-Show Fee" desc="Apply fee when client doesn't show" value={bookingRules.noShowFee} onChange={(v: boolean) => setBookingRules({ ...bookingRules, noShowFee: v })} />
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Payment Processor</h2>
                <p className="text-[#6b7280] text-sm mb-6">Configure payment methods and integrations</p>
              </div>
              <div className="space-y-3">
                {paymentProcessors.map(processor => (
                  <div key={processor.name} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${processor.color}15` }}>
                        <CreditCard size={18} style={{ color: processor.color }} />
                      </div>
                      <div>
                        <div className="text-white text-sm" style={{ fontWeight: 600 }}>{processor.name}</div>
                        <div className="text-[#4b5563] text-xs">{processor.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {processor.active ? (
                        <span className="text-xs px-2.5 py-1 rounded-lg text-[#10b981]" style={{ background: 'rgba(16,185,129,0.1)', fontWeight: 600 }}>Active</span>
                      ) : (
                        <button
                          onClick={() => setPaymentProcessors(prev => prev.map(item => item.name === processor.name ? { ...item, active: true } : item))}
                          className="text-xs px-3 py-1.5 rounded-xl text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-all"
                          style={{ fontWeight: 600 }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'branding' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Branding Customization</h2>
                <p className="text-[#6b7280] text-sm mb-6">Customize your brand colors and appearance</p>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Accent Color</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {['#2563EB', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateAccentColor(color)}
                      className="w-10 h-10 rounded-xl transition-all relative"
                      style={{ background: color, border: accentColor === color ? '3px solid white' : '2px solid transparent' }}
                    >
                      {accentColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check size={16} color="white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#9ca3af]">Custom</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => updateAccentColor(e.target.value)}
                    className="w-10 h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <span className="text-sm text-[#9ca3af] font-mono">{accentColor}</span>
                </div>
              </div>

              {/* Preview */}
              <div className="p-5 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Preview</h3>
                <div className="space-y-3">
                  <button className="w-full py-3 rounded-xl text-white text-sm transition-all" style={{ background: accentColor, fontWeight: 600 }}>
                    Primary Button
                  </button>
                  <div className="p-4 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}30` }}>
                    <span className="text-sm" style={{ color: accentColor, fontWeight: 600 }}>Accent Card</span>
                    <p className="text-[#9ca3af] text-xs mt-1">Brand color applied to highlights</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'loyalty' && (
            <>
              <div>
                <h2 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Loyalty Status</h2>
                <p className="text-[#6b7280] text-sm mb-6">Set the criteria and benefits for each loyalty tier. Customers automatically qualify when they meet either the visits or spend threshold.</p>
              </div>

              <div className="space-y-5">
                {(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map(tier => {
                  const meta = tierMeta[tier];
                  const cfg = loyaltyTiers[tier];
                  const TierIcon = meta.icon;
                  return (
                    <div key={tier} className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: `1px solid ${meta.border}` }}>
                      {/* Tier header */}
                      <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: meta.bg, borderBottom: `1px solid ${meta.border}` }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                          <TierIcon size={15} style={{ color: meta.color }} />
                        </div>
                        <span className="text-white text-sm" style={{ fontWeight: 700, color: meta.color }}>{tier}</span>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Thresholds */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>MINIMUM VISITS</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={cfg.minVisits}
                                onChange={e => updateTier(tier, 'minVisits', e.target.value)}
                                className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                                placeholder="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4b5563]">visits</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>MINIMUM SPEND</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#4b5563]">$</span>
                              <input
                                type="number"
                                min="0"
                                value={cfg.minSpend}
                                onChange={e => updateTier(tier, 'minSpend', e.target.value)}
                                className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-7 pr-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Benefits */}
                        <div>
                          <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>BENEFITS &amp; PERKS</label>
                          <div className="space-y-1.5 mb-2">
                            {cfg.benefits.length === 0 && (
                              <p className="text-xs text-[#3f3f46] italic px-1">No benefits yet.</p>
                            )}
                            {cfg.benefits.map((b: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                                <input
                                  value={b}
                                  onChange={e => updateTier(tier, 'benefits', cfg.benefits.map((x: string, i: number) => i === idx ? e.target.value : x))}
                                  className="flex-1 bg-transparent text-xs text-white outline-none"
                                />
                                <button onClick={() => removeTierBenefit(tier, idx)} className="text-[#ef4444] hover:text-red-300 transition-colors flex-shrink-0">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={newBenefitInputs[tier]}
                              onChange={e => setNewBenefitInputs(prev => ({ ...prev, [tier]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addTierBenefit(tier)}
                              placeholder={`Add a ${tier} benefit...`}
                              className="flex-1 bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                            />
                            <button
                              onClick={() => addTierBenefit(tier)}
                              className="px-3 py-2 rounded-xl text-white transition-all"
                              style={{ background: meta.color, fontWeight: 600 }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl flex gap-3" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <div className="text-[#2563EB] text-lg">ℹ️</div>
                <div>
                  <div className="text-white text-xs mb-0.5" style={{ fontWeight: 600 }}>How it works</div>
                  <p className="text-[#6b7280] text-xs">A customer qualifies for a tier when they meet <span className="text-white">either</span> the visits <span className="text-white">or</span> the spend threshold. Higher tiers take precedence. Changes apply to new calculations — existing status is not retroactively changed.</p>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm transition-all disabled:opacity-60"
            style={{ background: accentColor, fontWeight: 600 }}
          >
            {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
