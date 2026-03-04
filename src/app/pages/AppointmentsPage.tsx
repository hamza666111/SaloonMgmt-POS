import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List,
  Clock, X, Check, Search, ChevronDown, User, Scissors, UserPlus, Phone, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { mockAppointments, mockClients, mockServices, mockStaff } from '../data/mockData';
import { useBranchStore } from '../store/useBranchStore';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'rgba(37,99,235,0.12)', text: '#2563EB', label: 'Confirmed' },
  completed: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Completed' },
  'in-progress': { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', label: 'In Progress' },
  pending: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Pending' },
  'no-show': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'No Show' },
};

const barberColors: Record<string, string> = {
  'Jordan Blake': '#2563EB',
  'Alex Torres': '#8b5cf6',
  'Sam Rivera': '#10b981',
  'Chris Morgan': '#f59e0b',
};

const hours = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
const allBarbers = ['Jordan Blake', 'Alex Torres', 'Sam Rivera', 'Chris Morgan'];

export function AppointmentsPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const branches = useBranchStore(state => state.branches);

  // Deterministically assign barbers to branches for dummy data isolation
  const barbers = allBarbers.filter((b, i) => {
    const assignedBranchId = branches[i % Math.max(1, branches.length)]?.id || activeBranchId;
    return assignedBranchId === activeBranchId;
  });

  const [view, setView] = useState<'day' | 'week' | 'list'>('day');
  const [showModal, setShowModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [newAppt, setNewAppt] = useState({ client: '', service: '', barber: '', time: '10:00', notes: '', deposit: false, addons: [] as string[] });
  const [addNewClient, setAddNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });

  const handleSave = () => {
    if (addNewClient && !newClient.name.trim()) {
      toast.error('Please enter the customer name');
      return;
    }
    const clientName = addNewClient ? newClient.name.trim() : newAppt.client;
    if (!clientName) { toast.error('Please select or add a client'); return; }
    toast.success(addNewClient ? `Appointment scheduled for ${clientName}` : 'Appointment scheduled');
    setShowModal(false);
    setNewAppt({ client: '', service: '', barber: '', time: '10:00', notes: '', deposit: false, addons: [] });
    setAddNewClient(false);
    setNewClient({ name: '', phone: '', email: '' });
  };

  const getApptsByBarber = (barber: string) =>
    mockAppointments.filter(a => a.barber === barber);

  const getApptAtTime = (barber: string, hour: string) => {
    const h = parseInt(hour);
    return mockAppointments.filter(a => {
      if (a.barber !== barber) return false;
      const ah = parseInt(a.time.split(':')[0]);
      return ah === h;
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#111111' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-white text-lg" style={{ fontWeight: 700 }}>Appointments</h1>
            <p className="text-[#6b7280] text-xs mt-0.5">Tuesday, March 3, 2026</p>
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['day', 'week', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${view === v ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-white'}`}
                style={{ fontWeight: 500 }}
              >
                {v === 'day' && <Calendar size={13} />}
                {v === 'list' && <List size={13} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="text-[#6b7280] hover:text-white"><ChevronLeft size={16} /></button>
            <span className="text-white text-sm px-2" style={{ fontWeight: 500 }}>Today</span>
            <button className="text-[#6b7280] hover:text-white"><ChevronRight size={16} /></button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
            style={{ fontWeight: 600 }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Appointment</span>
          </button>
        </div>
      </div>

      {/* Barber Legend */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-3 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {barbers.map(b => (
          <div key={b} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: barberColors[b] }} />
            <span className="text-xs text-[#9ca3af]">{b}</span>
          </div>
        ))}
        <div className="flex items-center gap-4 ml-auto flex-shrink-0">
          {Object.entries(statusColors).slice(0, 4).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: val.text }} />
              <span className="text-xs text-[#4b5563]">{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {view === 'list' ? (
          // List View
          <div className="p-4 lg:p-6 space-y-2 max-w-3xl">
            {mockAppointments.filter(a => barbers.includes(a.barber)).map(appt => (
              <div
                key={appt.id}
                onClick={() => setSelectedAppt(appt)}
                className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:bg-white/[0.02] transition-all"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: barberColors[appt.barber] || '#6b7280' }} />
                <div className="w-16 flex-shrink-0">
                  <div className="text-white text-sm" style={{ fontWeight: 600 }}>{appt.time}</div>
                  <div className="text-[#4b5563] text-xs">{appt.duration}min</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm" style={{ fontWeight: 500 }}>{appt.client}</div>
                  <div className="text-[#6b7280] text-xs">{appt.service}</div>
                </div>
                <div className="hidden md:block text-xs text-[#6b7280]">{appt.barber}</div>
                <div className="text-white text-sm" style={{ fontWeight: 600 }}>${appt.price}</div>
                <span className="px-2.5 py-1 rounded-lg text-xs flex-shrink-0"
                  style={{ background: statusColors[appt.status]?.bg, color: statusColors[appt.status]?.text, fontWeight: 500 }}>
                  {statusColors[appt.status]?.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          // Day View Grid
          <div className="flex" style={{ minWidth: view === 'day' ? '600px' : '900px' }}>
            {/* Time column */}
            <div className="w-16 flex-shrink-0 pt-12">
              {hours.map(h => (
                <div key={h} className="h-28 flex items-start justify-end pr-3 pt-1">
                  <span className="text-xs text-[#3f3f46]">{h}</span>
                </div>
              ))}
            </div>

            {/* Barber columns */}
            <div className="flex flex-1 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {(view === 'day' ? barbers : barbers.slice(0, 3)).map(barber => (
                <div key={barber} className="flex-1 min-w-0" style={{ background: '#111111' }}>
                  {/* Barber header */}
                  <div className="h-12 flex items-center px-3 gap-2 sticky top-0 z-20" style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barberColors[barber] || '#6b7280' }} />
                    <span className="text-xs text-[#9ca3af] truncate" style={{ fontWeight: 500 }}>{barber}</span>
                  </div>
                  {/* Time slots */}
                  <div className="relative">
                    {hours.map(hour => (
                      <div key={hour} className="h-28 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {getApptAtTime(barber, hour).map(appt => (
                          <div
                            key={appt.id}
                            onClick={() => setSelectedAppt(appt)}
                            className="absolute left-1 right-1 rounded-xl px-2 py-1.5 cursor-pointer hover:opacity-100 hover:z-30 transition-all flex flex-col overflow-hidden"
                            style={{
                              top: '4px',
                              height: `calc(${(appt.duration / 60) * 112 - 8}px)`,
                              minHeight: 'min-content',
                              background: `${barberColors[appt.barber] || '#6b7280'}18`,
                              border: `1px solid ${barberColors[appt.barber] || '#6b7280'}30`,
                              zIndex: 10,
                            }}
                          >
                            <div className="text-white text-xs truncate" style={{ fontWeight: 600 }}>{appt.client}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="text-[#9ca3af] text-[11px] truncate min-w-0">{appt.service}</div>
                              <div className="text-[11px] ml-auto flex-shrink-0" style={{ color: barberColors[appt.barber], fontWeight: 500 }}>${appt.price}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAppt(null)} />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden z-10" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>Appointment Details</h3>
              <button onClick={() => setSelectedAppt(null)} className="text-[#6b7280] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center text-sm text-white" style={{ fontWeight: 700 }}>
                  {selectedAppt.client.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-white text-sm" style={{ fontWeight: 600 }}>{selectedAppt.client}</div>
                  <div className="text-[#6b7280] text-xs mt-0.5">{selectedAppt.service}</div>
                </div>
                <span className="ml-auto px-2.5 py-1 rounded-lg text-xs" style={{ background: statusColors[selectedAppt.status]?.bg, color: statusColors[selectedAppt.status]?.text, fontWeight: 500 }}>
                  {statusColors[selectedAppt.status]?.label}
                </span>
              </div>
              {[
                { label: 'Time', value: `${selectedAppt.time} · ${selectedAppt.duration} min` },
                { label: 'Barber', value: selectedAppt.barber },
                { label: 'Price', value: `$${selectedAppt.price}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs text-[#6b7280]">{label}</span>
                  <span className="text-xs text-white" style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { toast.success('Appointment confirmed'); setSelectedAppt(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10b981]/10 text-[#10b981] text-sm transition-all hover:bg-[#10b981]/20"
                  style={{ fontWeight: 600 }}
                >
                  <Check size={15} /> Confirm
                </button>
                <button
                  onClick={() => { toast.error('Appointment cancelled'); setSelectedAppt(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ef4444]/10 text-[#ef4444] text-sm transition-all hover:bg-[#ef4444]/20"
                  style={{ fontWeight: 600 }}
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>New Appointment</h3>
              <button onClick={() => setShowModal(false)} className="text-[#6b7280] hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Client */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#9ca3af]" style={{ letterSpacing: '0.05em' }}>CLIENT</label>
                  <button
                    type="button"
                    onClick={() => { setAddNewClient(!addNewClient); setNewClient({ name: '', phone: '', email: '' }); setNewAppt({...newAppt, client: ''}); }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: addNewClient ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)',
                      border: addNewClient ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: addNewClient ? '#2563EB' : '#9ca3af',
                      fontWeight: addNewClient ? 600 : 400,
                    }}
                  >
                    <UserPlus size={12} />
                    {addNewClient ? 'Adding New' : 'Add New Customer'}
                  </button>
                </div>
                {addNewClient ? (
                  <div className="space-y-2.5 p-3 rounded-xl" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
                    <div className="flex items-center gap-1.5 text-xs text-[#2563EB] mb-2" style={{ fontWeight: 600 }}>
                      <UserPlus size={12} /> New Customer
                    </div>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                      <input
                        type="text"
                        placeholder="Full name *"
                        value={newClient.name}
                        onChange={e => setNewClient({...newClient, name: e.target.value})}
                        className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={newClient.phone}
                        onChange={e => setNewClient({...newClient, phone: e.target.value})}
                        className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={newClient.email}
                        onChange={e => setNewClient({...newClient, email: e.target.value})}
                        className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                    <select value={newAppt.client} onChange={e => setNewAppt({...newAppt, client: e.target.value})}
                      className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all appearance-none">
                      <option value="">Select existing client...</option>
                      {mockClients.map(c => <option key={c.id} value={c.name}>{c.name} · {c.phone}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* Service */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>SERVICE</label>
                <div className="relative">
                  <Scissors size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
                  <select value={newAppt.service} onChange={e => setNewAppt({...newAppt, service: e.target.value})}
                    className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all appearance-none">
                    <option value="">Select service...</option>
                    {mockServices.map(s => <option key={s.id} value={s.name}>{s.name} · ${s.price}</option>)}
                  </select>
                </div>
              </div>
              {/* Barber */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>BARBER</label>
                <div className="grid grid-cols-2 gap-2">
                  {mockStaff.filter(s => s.status === 'Active').map(s => (
                    <button
                      key={s.id}
                      onClick={() => setNewAppt({...newAppt, barber: s.name})}
                      className="flex items-center gap-2 p-2.5 rounded-xl transition-all text-left"
                      style={{
                        background: newAppt.barber === s.name ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
                        border: newAppt.barber === s.name ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white" style={{ background: barberColors[s.name] || '#374151', fontWeight: 700 }}>
                        {s.avatar}
                      </div>
                      <span className="text-xs text-white truncate" style={{ fontWeight: newAppt.barber === s.name ? 600 : 400 }}>{s.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Time */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>TIME</label>
                <div className="grid grid-cols-4 gap-2">
                  {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNewAppt({...newAppt, time: t})}
                      className="py-2 rounded-xl text-xs transition-all"
                      style={{
                        background: newAppt.time === t ? '#2563EB' : 'rgba(255,255,255,0.03)',
                        border: newAppt.time === t ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.06)',
                        color: newAppt.time === t ? '#fff' : '#9ca3af',
                        fontWeight: newAppt.time === t ? 600 : 400,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {/* Add-ons */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>ADD-ONS</label>
                <div className="flex flex-wrap gap-2">
                  {['Hot Towel +$8', 'Scalp Massage +$12', 'Beard Oil +$6', 'Line Up +$10'].map(addon => {
                    const active = newAppt.addons.includes(addon);
                    return (
                      <button
                        key={addon}
                        onClick={() => setNewAppt({...newAppt, addons: active ? newAppt.addons.filter(a => a !== addon) : [...newAppt.addons, addon]})}
                        className="px-3 py-1.5 rounded-xl text-xs transition-all"
                        style={{
                          background: active ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
                          border: active ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.06)',
                          color: active ? '#2563EB' : '#9ca3af',
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {addon}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Deposit */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div className="text-sm text-white" style={{ fontWeight: 500 }}>Require deposit</div>
                  <div className="text-xs text-[#6b7280]">Charge 50% upfront</div>
                </div>
                <button
                  onClick={() => setNewAppt({...newAppt, deposit: !newAppt.deposit})}
                  className="w-11 h-6 rounded-full transition-all relative"
                  style={{ background: newAppt.deposit ? '#2563EB' : '#2a2a2a' }}
                >
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all" style={{ left: newAppt.deposit ? '24px' : '4px' }} />
                </button>
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>NOTES</label>
                <textarea
                  value={newAppt.notes}
                  onChange={e => setNewAppt({...newAppt, notes: e.target.value})}
                  placeholder="Special requests or notes..."
                  rows={2}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
                style={{ fontWeight: 600 }}
              >
                Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
