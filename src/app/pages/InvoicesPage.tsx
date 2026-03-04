import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ReceiptText, Search, User, Scissors, Phone, CreditCard, Banknote, Smartphone, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/ui/modal';
import { getSales, type UiInvoice } from '../lib/supabaseData';
import { useBranchStore } from '../store/useBranchStore';
import { toast } from 'sonner';

const datePresets = ['All', 'Today', 'This Month', 'Selected Month', 'Custom Range'] as const;

type DatePreset = typeof datePresets[number];

type InvoiceFilterState = {
  search: string;
  datePreset: DatePreset;
  selectedMonth: string;
  startDate: string;
  endDate: string;
};

type Invoice = UiInvoice;

const formatDateLocal = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function InvoicesPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const [filters, setFilters] = useState<InvoiceFilterState>({
    search: '',
    datePreset: 'This Month',
    selectedMonth: formatDateLocal(new Date()).slice(0, 7),
    startDate: '',
    endDate: '',
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadInvoices = async () => {
      setIsLoading(true);
      try {
        const rows = await getSales(activeBranchId);
        if (!mounted) return;
        setInvoices(rows);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load invoices';
        toast.error(message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadInvoices();

    return () => {
      mounted = false;
    };
  }, [activeBranchId]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const today = formatDateLocal(new Date());
    const currentMonth = today.slice(0, 7);

    return invoices.filter(invoice => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
        invoice.customerName.toLowerCase().includes(normalizedSearch) ||
        invoice.customerPhone.toLowerCase().includes(normalizedSearch) ||
        invoice.barberName.toLowerCase().includes(normalizedSearch) ||
        invoice.barberPhone.toLowerCase().includes(normalizedSearch) ||
        invoice.services.some(service => service.name.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;

      if (filters.datePreset === 'All') return true;

      if (filters.datePreset === 'Today') {
        return invoice.date === today;
      }

      if (filters.datePreset === 'This Month') {
        return invoice.date.startsWith(currentMonth);
      }

      if (filters.datePreset === 'Selected Month') {
        if (!filters.selectedMonth) return true;
        return invoice.date.startsWith(filters.selectedMonth);
      }

      const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
      const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;
      const invoiceDate = new Date(`${invoice.date}T12:00:00`);

      if (start && invoiceDate < start) return false;
      if (end && invoiceDate > end) return false;

      return true;
    });
  }, [filters, invoices]);

  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const avgTicket = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Invoices</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{filteredInvoices.length} invoices in view</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <ReceiptText size={16} className="text-[#2563EB]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, color: '#2563EB' },
          { label: 'Average Ticket', value: `$${avgTicket.toFixed(2)}`, color: '#10b981' },
          { label: 'Invoices', value: filteredInvoices.length.toString(), color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-white text-xl mb-0.5" style={{ fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div className="text-white text-xs" style={{ fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input
            type="text"
            value={filters.search}
            onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
            placeholder="Search invoice #, customer, phone, barber, service..."
            className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:border-[#2563EB]/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
            <select
              value={filters.datePreset}
              onChange={event => setFilters(prev => ({ ...prev, datePreset: event.target.value as DatePreset }))}
              className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all appearance-none"
            >
              {datePresets.map(preset => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </div>
          {filters.datePreset === 'Selected Month' && (
            <input
              type="month"
              value={filters.selectedMonth}
              onChange={event => setFilters(prev => ({ ...prev, selectedMonth: event.target.value }))}
              className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all"
            />
          )}
          {filters.datePreset === 'Custom Range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={event => setFilters(prev => ({ ...prev, startDate: event.target.value }))}
                className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all"
              />
              <span className="text-[#4b5563] text-xs">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={event => setFilters(prev => ({ ...prev, endDate: event.target.value }))}
                className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs text-[#4b5563]" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, letterSpacing: '0.05em' }}>
          <div className="col-span-2">INVOICE</div>
          <div className="col-span-3">CUSTOMER</div>
          <div className="col-span-3">SERVICES</div>
          <div className="col-span-2">BARBER</div>
          <div className="col-span-1">DATE</div>
          <div className="col-span-1 text-right">TOTAL</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {isLoading && <div className="px-5 py-4 text-sm text-[#9ca3af]">Loading invoices...</div>}
          {filteredInvoices.map(invoice => (
            <div
              key={invoice.id}
              className="grid lg:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedInvoice(invoice)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedInvoice(invoice);
                }
              }}
            >
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)' }}>
                  <ReceiptText size={14} className="text-[#2563EB]" />
                </div>
                <div>
                  <div className="text-white text-sm" style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</div>
                  <div className="text-[#4b5563] text-xs">{invoice.paymentMethod}</div>
                </div>
              </div>

              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <User size={14} className="text-[#9ca3af]" />
                  </div>
                  <div>
                    <div className="text-white text-sm" style={{ fontWeight: 600 }}>{invoice.customerName}</div>
                    <div className="text-[#4b5563] text-xs flex items-center gap-1">
                      <Phone size={11} /> {invoice.customerPhone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-3">
                <div className="text-white text-sm" style={{ fontWeight: 600 }}>
                  {invoice.services.map(service => service.name).join(', ')}
                </div>
                <div className="text-[#4b5563] text-xs">
                  {invoice.services.length} service{invoice.services.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <Scissors size={14} className="text-[#8b5cf6]" />
                  </div>
                  <div>
                    <div className="text-white text-sm" style={{ fontWeight: 600 }}>{invoice.barberName}</div>
                    <div className="text-[#4b5563] text-xs flex items-center gap-1">
                      <Phone size={11} /> {invoice.barberPhone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 text-sm text-[#9ca3af]">
                {invoice.date}
              </div>

              <div className="col-span-1 text-right text-white text-sm" style={{ fontWeight: 700 }}>
                ${invoice.total.toFixed(2)}
              </div>

              <div className="lg:hidden col-span-12 text-xs text-[#4b5563]">
                {invoice.invoiceNumber} • {invoice.date} • ${invoice.total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={!!selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
        title={selectedInvoice ? `Invoice ${selectedInvoice.invoiceNumber}` : 'Invoice'}
        description={selectedInvoice ? `${selectedInvoice.date} • ${selectedInvoice.paymentMethod}` : ''}
        desktopVariant="side"
        side="right"
        className="sm:max-w-[520px]"
      >
        {selectedInvoice && (() => {
          const subtotal = selectedInvoice.services.reduce((sum, service) => sum + service.price, 0);
          const taxAndCharges = Math.max(0, selectedInvoice.total - subtotal);
          const serviceCharge = parseFloat((subtotal * 0.05).toFixed(2));
          const tax = parseFloat((taxAndCharges - serviceCharge).toFixed(2));
          const taxRate = subtotal > 0 ? ((taxAndCharges / subtotal) * 100).toFixed(1) : '0.0';
          const paymentIcons: Record<string, JSX.Element> = {
            card: <CreditCard size={13} />,
            cash: <Banknote size={13} />,
            tap: <Smartphone size={13} />,
          };

          return (
            <div className="space-y-4">
              {/* Invoice Header */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[#2563EB] text-xs mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>INVOICE</div>
                    <div className="text-white text-lg" style={{ fontWeight: 800 }}>{selectedInvoice.invoiceNumber}</div>
                    <div className="text-[#6b7280] text-xs mt-1">{selectedInvoice.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600, border: '1px solid rgba(16,185,129,0.25)' }}>
                      <CheckCircle2 size={12} /> PAID
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs capitalize" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 500, border: '1px solid rgba(255,255,255,0.08)' }}>
                      {paymentIcons[selectedInvoice.paymentMethod] ?? <CreditCard size={13} />}
                      {selectedInvoice.paymentMethod}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Barber */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7280] mb-1.5" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
                    <User size={11} /> CUSTOMER
                  </div>
                  <div className="text-white text-sm" style={{ fontWeight: 600 }}>{selectedInvoice.customerName}</div>
                  <div className="text-[#6b7280] text-xs mt-1 flex items-center gap-1">
                    <Phone size={10} /> {selectedInvoice.customerPhone}
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7280] mb-1.5" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
                    <Scissors size={11} /> BARBER
                  </div>
                  <div className="text-white text-sm" style={{ fontWeight: 600 }}>{selectedInvoice.barberName}</div>
                  <div className="text-[#6b7280] text-xs mt-1 flex items-center gap-1">
                    <Phone size={10} /> {selectedInvoice.barberPhone}
                  </div>
                </div>
              </div>

              {/* Services Breakdown */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-xs text-[#6b7280]" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>SERVICES</span>
                  <span className="text-xs text-[#6b7280]">{selectedInvoice.services.length} item{selectedInvoice.services.length !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  {selectedInvoice.services.map((service, idx) => (
                    <div key={service.name} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: idx < selectedInvoice.services.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                          <Scissors size={13} className="text-[#8b5cf6]" />
                        </div>
                        <div>
                          <div className="text-white text-sm" style={{ fontWeight: 500 }}>{service.name}</div>
                          <div className="text-[#4b5563] text-xs">1 × ${service.price.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-white text-sm" style={{ fontWeight: 600 }}>${service.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-xs text-[#6b7280]" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>PRICE BREAKDOWN</span>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9ca3af]">Subtotal</span>
                    <span className="text-white" style={{ fontWeight: 500 }}>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9ca3af] flex items-center gap-1.5">
                      Service Charge
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>5%</span>
                    </span>
                    <span className="text-white" style={{ fontWeight: 500 }}>${serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9ca3af] flex items-center gap-1.5">
                      Tax
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{taxRate}%</span>
                    </span>
                    <span className="text-white" style={{ fontWeight: 500 }}>${Math.max(0, tax).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-base" style={{ fontWeight: 700 }}>Total</span>
                      <span className="text-white text-xl" style={{ fontWeight: 800, color: '#2563EB' }}>${selectedInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)' }}>
                  {paymentIcons[selectedInvoice.paymentMethod] ?? <CreditCard size={16} />}
                </div>
                <div>
                  <div className="text-xs text-[#6b7280] mb-0.5">Payment Method</div>
                  <div className="text-white text-sm capitalize" style={{ fontWeight: 600 }}>
                    {selectedInvoice.paymentMethod === 'tap' ? 'Tap / Contactless' : selectedInvoice.paymentMethod === 'card' ? 'Credit / Debit Card' : 'Cash'}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#10b981', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Paid
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
