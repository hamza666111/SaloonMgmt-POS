import { useEffect, useState } from 'react';
import {
  Search, Plus, Minus, X, ChevronDown, CreditCard,
  Banknote, Zap, Gift, Scissors, Package, Percent,
  Users, Check, RefreshCw, Columns2,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { ThermalReceipt } from '../components/pos/ThermalReceipt';
import { runPrintJob } from '../lib/printUtils';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  createSale,
  getClients,
  getSettings,
  getProducts,
  getSales,
  getServices,
  processRefund,
  saveSettings,
  type UiClient,
  type UiInvoice,
  type UiProduct,
  type UiService,
} from '../lib/supabaseData';
import { useBranchStore } from '../store/useBranchStore';

type CartItem = { id: string; name: string; price: number; qty: number; type: 'service' | 'product' };
type PayMethod = 'cash' | 'card' | 'tap' | 'gift' | null;

const tipOptions = [10, 15, 20, 25];
const discountOptions = [5, 10, 15, 20];

export function POSPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const { businessInfo, receiptSettings } = useSettingsStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<UiClient[]>([]);
  const [services, setServices] = useState<UiService[]>([]);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [recentSales, setRecentSales] = useState<UiInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [searchQ, setSearchQ] = useState('');
  const [tip, setTip] = useState<number | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [discount, setDiscount] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [splitCount, setSplitCount] = useState(2);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastOrderInfo, setLastOrderInfo] = useState<any>(null);

  const serviceCategories = ['All', 'Haircut', 'Beard', 'Combo', 'Shave', 'Treatment'];
  const productCategories = ['All', 'Styling', 'Beard Care', 'Hair Care', 'Shave', 'Treatment'];

  const loadPOSData = async () => {
    setIsLoading(true);
    try {
      const [clientRows, serviceRows, productRows, salesRows] = await Promise.all([
        getClients(activeBranchId),
        getServices(activeBranchId),
        getProducts(activeBranchId),
        getSales(activeBranchId, 15),
      ]);
      setClients(clientRows);
      setServices(serviceRows);
      setProducts(productRows);
      setRecentSales(salesRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load POS data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPOSData();
  }, [activeBranchId]);

  const items = activeTab === 'services' ? services : products;
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = discount ? (subtotal * discount) / 100 : 0;
  const afterDiscount = subtotal - discountAmt;
  const tipAmt = tip === 'custom' ? parseFloat(customTip) || 0 : tip ? (afterDiscount * tip) / 100 : 0;
  const total = afterDiscount + tipAmt;
  const changeDue = cashAmount ? Math.max(0, parseFloat(cashAmount) - total) : 0;
  const latestSaleTotal = lastOrderInfo?.total || recentSales[0]?.total || total;
  const latestSaleServiceAmount = lastOrderInfo?.subtotal || recentSales[0]?.total || total;

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, type: activeTab === 'services' ? 'service' : 'product' }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const handleCheckout = () => {
    if (!payMethod) return toast.error('Select a payment method');
    setShowPayModal(true);
  };

  const handlePayConfirm = async () => {
    if (payMethod === 'cash' && cashAmount && parseFloat(cashAmount) < total) {
      toast.error('Cash amount is lower than total due');
      return;
    }

    const selectedClientRow = clients.find(client => client.id === selectedClient);
    const normalizedPayMethod = payMethod === 'gift' ? 'giftcard' : (payMethod || 'cash');

    try {
      const createdSale = await createSale({
        branch_id: activeBranchId,
        client_id: selectedClientRow?.id,
        customerName: selectedClientRow?.name || 'Walk-in',
        customerPhone: selectedClientRow?.phone || '',
        payment_method: normalizedPayMethod,
        subtotal,
        discount: discountAmt,
        tax: 0,
        tip: tipAmt,
        total,
        items: cart.map(item => ({
          item_id: item.id,
          item_type: item.type,
          item_name: item.name,
          quantity: item.qty,
          price: item.price,
        })),
      });

      setPaySuccess(true);
      toast.success(`Payment of $${total.toFixed(2)} processed successfully`);

      setLastOrderInfo({
        saleId: createdSale.id,
        invoiceNumber: createdSale.invoiceNumber,
        date: new Date(createdSale.date),
        items: cart.map(c => ({ name: c.name, quantity: c.qty, price: c.price, total: c.price * c.qty })),
        subtotal,
        tax: 0,
        discount: discountAmt,
        tip: tipAmt,
        total,
        paymentMethod: payMethod || 'cash',
      });

      await loadPOSData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process payment';
      toast.error(message);
    }
  };

  const finishSale = () => {
    setPaySuccess(false);
    setShowPayModal(false);
    setCart([]);
    setTip(null);
    setDiscount(null);
    setPayMethod(null);
    setCashAmount('');
    setSelectedClient('');
  };

  const handleRefund = async (amount: number, label: string) => {
    const targetSaleId = lastOrderInfo?.saleId || recentSales[0]?.id;
    if (!targetSaleId) {
      toast.error('No recent sale available for refund');
      return;
    }

    try {
      await processRefund({
        sale_id: targetSaleId,
        amount,
        reason: label,
      });
      setShowRefundModal(false);
      toast.success(`${label} processed`);
      await loadPOSData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process refund';
      toast.error(message);
    }
  };

  return (
    <>
    <div className="h-full flex flex-col lg:flex-row print:hidden" style={{ background: '#111111' }}>
      {/* Left: Services/Products Grid */}
      <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Search + Filter */}
        <div className="p-4 space-y-3" style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search services & products..."
                className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:border-[#2563EB]/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['services', 'products'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCategoryFilter('All'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${activeTab === tab ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-white'}`}
                  style={{ fontWeight: 500 }}
                >
                  {tab === 'services' ? <Scissors size={13} /> : <Package size={13} />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(activeTab === 'services' ? serviceCategories : productCategories).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: categoryFilter === cat ? '#2563EB' : 'rgba(255,255,255,0.04)',
                  color: categoryFilter === cat ? '#fff' : '#6b7280',
                  border: categoryFilter === cat ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.06)',
                  fontWeight: categoryFilter === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Client selector */}
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-[#2563EB]/50 transition-all appearance-none"
              style={{ color: selectedClient ? '#fff' : '#4b5563' }}
            >
              <option value="">Walk-in / Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <div className="text-sm text-[#9ca3af] mb-3">Loading catalog...</div>}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="relative p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  style={{
                    background: inCart ? 'rgba(37,99,235,0.08)' : '#1a1a1a',
                    border: inCart ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {inCart && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-[10px] text-white" style={{ fontWeight: 700 }}>
                      {inCart.qty}
                    </div>
                  )}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: activeTab === 'services' ? 'rgba(37,99,235,0.1)' : 'rgba(139,92,246,0.1)' }}>
                    {activeTab === 'services' ? (
                      <Scissors size={16} style={{ color: '#2563EB' }} />
                    ) : (
                      <Package size={16} style={{ color: '#8b5cf6' }} />
                    )}
                  </div>
                  <div className="text-white text-sm mb-1 leading-tight" style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="text-[#4b5563] text-xs mb-2">{item.category}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-base" style={{ fontWeight: 700 }}>${item.price}</span>
                    {'duration' in item && <span className="text-xs text-[#4b5563]">{item.duration}m</span>}
                    {'stock' in item && (
                      <span className="text-xs" style={{ color: (item as any).stock <= 5 ? '#ef4444' : '#4b5563' }}>
                        {(item as any).stock} in stock
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart Panel */}
      <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col" style={{ background: '#161616' }}>
        {/* Cart Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[#2563EB]" />
            <span className="text-white text-sm" style={{ fontWeight: 700 }}>Order Summary</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-[10px] text-white" style={{ fontWeight: 700 }}>
                {cart.reduce((s, c) => s + c.qty, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-[#ef4444] hover:text-red-400 transition-colors">Clear all</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <Receipt size={24} className="text-[#3f3f46]" />
              </div>
              <p className="text-[#6b7280] text-sm">No items added</p>
              <p className="text-[#3f3f46] text-xs mt-1">Select services or products to add</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: item.type === 'service' ? 'rgba(37,99,235,0.1)' : 'rgba(139,92,246,0.1)' }}>
                    {item.type === 'service' ? <Scissors size={14} style={{ color: '#2563EB' }} /> : <Package size={14} style={{ color: '#8b5cf6' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs truncate" style={{ fontWeight: 500 }}>{item.name}</div>
                    <div className="text-[#6b7280] text-xs">${item.price} each</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-[#9ca3af] transition-all"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-sm text-white" style={{ fontWeight: 600 }}>{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-[#9ca3af] transition-all"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-white text-sm flex-shrink-0" style={{ fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                    ${(item.price * item.qty).toFixed(0)}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-[#4b5563] hover:text-[#ef4444] transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="px-4 space-y-4">
              {/* Discount */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Percent size={13} className="text-[#6b7280]" />
                  <span className="text-xs text-[#9ca3af]" style={{ fontWeight: 500 }}>Discount</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {discountOptions.map(d => (
                    <button
                      key={d}
                      onClick={() => setDiscount(discount === d ? null : d)}
                      className="px-3 py-1.5 rounded-xl text-xs transition-all"
                      style={{
                        background: discount === d ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                        color: discount === d ? '#10b981' : '#6b7280',
                        border: discount === d ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        fontWeight: discount === d ? 600 : 400,
                      }}
                    >
                      {d}% off
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const input = prompt('Enter discount percentage (1-90):');
                      if (!input) return;
                      const percent = Number(input);
                      if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
                        toast.error('Invalid discount percentage');
                        return;
                      }
                      setDiscount(percent);
                      toast.success(`Applied ${percent}% discount`);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-[#6b7280] transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    Code
                  </button>
                </div>
              </div>

              {/* Tip */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#9ca3af]" style={{ fontWeight: 500 }}>Tip for barber</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {tipOptions.map(t => (
                    <button
                      key={t}
                      onClick={() => setTip(tip === t ? null : t)}
                      className="px-3 py-1.5 rounded-xl text-xs transition-all"
                      style={{
                        background: tip === t ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                        color: tip === t ? '#2563EB' : '#6b7280',
                        border: tip === t ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        fontWeight: tip === t ? 600 : 400,
                      }}
                    >
                      {t}% · ${((afterDiscount * t) / 100).toFixed(0)}
                    </button>
                  ))}
                  <button
                    onClick={() => setTip(tip === 'custom' ? null : 'custom')}
                    className="px-3 py-1.5 rounded-xl text-xs transition-all"
                    style={{
                      background: tip === 'custom' ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                      color: tip === 'custom' ? '#2563EB' : '#6b7280',
                      border: tip === 'custom' ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {tip === 'custom' && (
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">$</span>
                    <input
                      type="number"
                      value={customTip}
                      onChange={e => setCustomTip(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6b7280]">Subtotal</span>
                  <span className="text-[#9ca3af]">${subtotal.toFixed(2)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#10b981]">Discount ({discount}%)</span>
                    <span className="text-[#10b981]">-${discountAmt.toFixed(2)}</span>
                  </div>
                )}
                {tipAmt > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6b7280]">Tip</span>
                    <span className="text-[#9ca3af]">+${tipAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white text-sm" style={{ fontWeight: 700 }}>Total</span>
                  <span className="text-white text-xl" style={{ fontWeight: 800 }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <span className="text-xs text-[#9ca3af] mb-2 block" style={{ fontWeight: 500 }}>Payment Method</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'cash', label: 'Cash', icon: Banknote },
                    { key: 'card', label: 'Card', icon: CreditCard },
                    { key: 'tap', label: 'Tap to Pay', icon: Zap },
                    { key: 'gift', label: 'Gift Card', icon: Gift },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setPayMethod(payMethod === key as PayMethod ? null : key as PayMethod)}
                      className="flex items-center gap-2 p-3 rounded-xl transition-all"
                      style={{
                        background: payMethod === key ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.03)',
                        border: payMethod === key ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <Icon size={16} style={{ color: payMethod === key ? '#2563EB' : '#6b7280' }} />
                      <span className="text-xs" style={{ color: payMethod === key ? '#fff' : '#9ca3af', fontWeight: payMethod === key ? 600 : 400 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Footer */}
        {cart.length > 0 && (
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSplitModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm transition-all hover:bg-white/[0.04]"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <Columns2 size={15} /> Split
              </button>
              <button
                onClick={() => setShowRefundModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm transition-all hover:bg-white/[0.04]"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <RefreshCw size={15} /> Refund
              </button>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white transition-all hover:opacity-90"
              style={{
                background: payMethod ? 'linear-gradient(135deg, #2563EB, #1d4ed8)' : 'rgba(37,99,235,0.4)',
                cursor: payMethod ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              <CreditCard size={18} />
              Charge ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !paySuccess && setShowPayModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden z-10" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            {paySuccess ? (
              <div className="flex flex-col items-center py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#10b981]/10 border-2 border-[#10b981]/30 flex items-center justify-center mb-4">
                  <Check size={28} className="text-[#10b981]" />
                </div>
                <h3 className="text-white text-lg mb-1" style={{ fontWeight: 700 }}>Payment Successful</h3>
                <p className="text-[#6b7280] text-sm mb-6">${total.toFixed(2)} processed</p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => { runPrintJob(); toast.info('Printing receipt...'); }}
                    className="flex-1 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl text-sm transition-all border border-white/10"
                    style={{ fontWeight: 600 }}
                  >
                    Print Receipt
                  </button>
                  <button 
                    onClick={finishSale}
                    className="flex-1 py-3 rounded-xl text-white text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)', fontWeight: 600 }}
                  >
                    New Sale
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Confirm Payment</h3>
                  <button onClick={() => setShowPayModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
                    <div className="text-[#6b7280] text-xs mb-1">Amount Due</div>
                    <div className="text-white text-3xl" style={{ fontWeight: 800 }}>${total.toFixed(2)}</div>
                    <div className="text-[#4b5563] text-xs mt-1">via {payMethod === 'cash' ? 'Cash' : payMethod === 'card' ? 'Card' : payMethod === 'tap' ? 'Tap to Pay' : 'Gift Card'}</div>
                  </div>

                  {payMethod === 'cash' && (
                    <div>
                      <label className="text-xs text-[#9ca3af] mb-2 block">Cash received</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">$</span>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={e => setCashAmount(e.target.value)}
                          placeholder={total.toFixed(2)}
                          className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-7 pr-4 py-3 text-white text-sm focus:border-[#2563EB]/50 transition-all"
                        />
                      </div>
                      {cashAmount && parseFloat(cashAmount) >= total && (
                        <div className="mt-2 p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span className="text-[#10b981] text-sm" style={{ fontWeight: 600 }}>Change: ${changeDue.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handlePayConfirm}
                    className="w-full py-4 rounded-2xl text-white text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)', fontWeight: 700 }}
                  >
                    {payMethod === 'tap' ? 'Tap to Pay — Waiting...' : 'Confirm Payment'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!selectedClient) {
                          toast.error('Select a client before saving card');
                          return;
                        }

                        try {
                          const settings = await getSettings(activeBranchId);
                          const cardsByClient = (settings?.savedCardsByClient || {}) as Record<string, Array<{ method: string; savedAt: string }>>;
                          const existing = Array.isArray(cardsByClient[selectedClient]) ? cardsByClient[selectedClient] : [];
                          cardsByClient[selectedClient] = [
                            { method: payMethod || 'card', savedAt: new Date().toISOString() },
                            ...existing,
                          ];

                          await saveSettings(activeBranchId, {
                            ...(settings || {}),
                            savedCardsByClient: cardsByClient,
                          });
                          toast.success('Card saved to customer profile');
                        } catch (error) {
                          const message = error instanceof Error ? error.message : 'Failed to save card';
                          toast.error(message);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl border text-xs text-[#9ca3af] hover:bg-white/[0.04] transition-all"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      Save Card on File
                    </button>
                    <button onClick={() => { runPrintJob(); toast.info('Printing receipt...'); }} className="flex-1 py-2.5 rounded-xl border text-xs text-[#9ca3af] hover:bg-white/[0.04] transition-all" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      Print Receipt
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSplitModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl z-10 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Split Payment</h3>
              <button onClick={() => setShowSplitModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-[#9ca3af] mb-3 block">Split between</label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white transition-all">
                    <Minus size={16} />
                  </button>
                  <span className="text-white text-3xl" style={{ fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>{splitCount}</span>
                  <button onClick={() => setSplitCount(Math.min(6, splitCount + 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white transition-all">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                {Array.from({ length: splitCount }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-sm text-[#9ca3af]">Person {i + 1}</span>
                    <span className="text-sm text-white" style={{ fontWeight: 700 }}>${(total / splitCount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setPayMethod('card');
                  setShowPayModal(true);
                  toast.success('Split payment configured');
                }}
                className="w-full py-3.5 rounded-2xl text-white text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)', fontWeight: 700 }}
              >
                Process Split Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRefundModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl z-10 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Process Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs text-[#ef4444]">Refunds will be processed back to the original payment method within 3-5 business days.</p>
              </div>
              {[
                { label: 'Full Refund', amount: latestSaleTotal.toFixed(2), numericAmount: latestSaleTotal },
                { label: 'Service Only', amount: latestSaleServiceAmount.toFixed(2), numericAmount: latestSaleServiceAmount },
                { label: 'Partial Refund', amount: '', numericAmount: latestSaleTotal / 2 },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => void handleRefund(opt.numericAmount, opt.label)}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.04] transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-sm text-white" style={{ fontWeight: 500 }}>{opt.label}</span>
                  {opt.amount && <span className="text-sm text-[#ef4444]" style={{ fontWeight: 700 }}>-${opt.amount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>

    {lastOrderInfo && (
      <ThermalReceipt
        shopName={businessInfo.name}
        address={businessInfo.address}
        phone={businessInfo.phone}
        website={businessInfo.website}
        logoDataUrl={businessInfo.logoDataUrl}
        qrCodeDataUrl={receiptSettings.qrCodeDataUrl}
        ratingUrl={receiptSettings.ratingUrl}
        invoiceNumber={lastOrderInfo.invoiceNumber}
        date={lastOrderInfo.date}
        cashierName="Reception Desk"
        items={lastOrderInfo.items}
        subtotal={lastOrderInfo.subtotal}
        tax={lastOrderInfo.tax}
        discount={lastOrderInfo.discount}
        tip={lastOrderInfo.tip}
        total={lastOrderInfo.total}
        paymentMethod={lastOrderInfo.paymentMethod}
      />
    )}
    </>
  );
}