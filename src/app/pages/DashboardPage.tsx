import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  TrendingUp, TrendingDown, Calendar, Users, DollarSign,
  AlertTriangle, Clock, ChevronRight, MoreHorizontal,
  ArrowUpRight, Scissors, ShoppingBag, XCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { revenueData, servicePopularityData, mockAppointments, mockProducts } from '../data/mockData';
import { useBranchStore } from '../store/useBranchStore';

const kpiCards = [
  { label: "Today's Revenue", value: '$2,340', change: '+18.2%', up: true, icon: DollarSign, color: '#2563EB' },
  { label: 'Appointments Today', value: '24', change: '+4 vs yesterday', up: true, icon: Calendar, color: '#8b5cf6' },
  { label: 'Walk-ins Waiting', value: '3', change: 'Avg wait: 12 min', up: null, icon: Clock, color: '#f59e0b' },
  { label: 'This Week Revenue', value: '$12,330', change: '+12.4%', up: true, icon: TrendingUp, color: '#10b981' },
  { label: 'No-show Rate', value: '4.2%', change: '-1.1% vs last week', up: false, icon: XCircle, color: '#ef4444' },
];

const statusColors: Record<string, string> = {
  confirmed: '#2563EB',
  completed: '#10b981',
  'in-progress': '#f59e0b',
  pending: '#6b7280',
  'no-show': '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-[#9ca3af] mb-1">{label}</p>
        <p className="text-white" style={{ fontWeight: 600 }}>${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [revenueView] = useState('week');
  
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const branches = useBranchStore(state => state.branches);
  const barbers = ['Jordan Blake', 'Alex Torres', 'Sam Rivera', 'Chris Morgan'];
  const activeBarbers = barbers.filter((b, i) => {
    const assignedBranchId = branches[i % Math.max(1, branches.length)]?.id || activeBranchId;
    return assignedBranchId === activeBranchId;
  });

  const lowStock = mockProducts.filter(p => p.stock <= p.reorderLevel);
  const filteredAppointments = mockAppointments.filter(a => activeBarbers.includes(a.barber));
  const todayAppts = filteredAppointments.slice(0, 6);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700, letterSpacing: '-0.3px' }}>Good morning, Admin</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Tuesday, March 3, 2026 · Downtown Branch</p>
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
          style={{ fontWeight: 600 }}
        >
          <Calendar size={15} />
          New Appointment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpiCards.map((card, i) => (
          <div key={i} className="p-4 rounded-2xl relative overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06]"
              style={{ background: `radial-gradient(circle, ${card.color} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.color}18` }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
              {card.up !== null && (
                <span className={`text-xs flex items-center gap-0.5 ${card.up ? 'text-[#10b981]' : 'text-[#ef4444]'}`} style={{ fontWeight: 500 }}>
                  {card.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </span>
              )}
            </div>
            <div className="text-white text-xl mb-0.5" style={{ fontWeight: 700, letterSpacing: '-0.5px' }}>{card.value}</div>
            <div className="text-[#4b5563] text-xs mb-1">{card.label}</div>
            <div className={`text-xs ${card.up === true ? 'text-[#10b981]' : card.up === false ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Weekly Revenue</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">This week · All services</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#111111' }}>
              {['Week', 'Month'].map(v => (
                <button key={v} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${revenueView === v.toLowerCase() ? 'bg-[#2563EB] text-white' : 'text-[#6b7280] hover:text-white'}`}
                  style={{ fontWeight: 500 }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Quick stats below chart */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div className="text-xs text-[#4b5563] mb-1">Avg / Day</div>
              <div className="text-white text-sm" style={{ fontWeight: 600 }}>$1,761</div>
            </div>
            <div>
              <div className="text-xs text-[#4b5563] mb-1">Best Day</div>
              <div className="text-white text-sm" style={{ fontWeight: 600 }}>Saturday</div>
            </div>
            <div>
              <div className="text-xs text-[#4b5563] mb-1">Total Appts</div>
              <div className="text-white text-sm" style={{ fontWeight: 600 }}>169</div>
            </div>
          </div>
        </div>

        {/* Service Popularity */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-4">
            <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Service Breakdown</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">This week</p>
          </div>
          <div className="flex justify-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={servicePopularityData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                  {servicePopularityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {servicePopularityData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-[#9ca3af]">{item.name}</span>
                </div>
                <span className="text-xs text-white" style={{ fontWeight: 600 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Today's Schedule</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">{filteredAppointments.length} appointments</p>
            </div>
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-blue-400 transition-colors"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {todayAppts.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-all">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: appt.color }} />
                <div className="w-12 flex-shrink-0">
                  <div className="text-white text-xs" style={{ fontWeight: 600 }}>{appt.time}</div>
                  <div className="text-[#4b5563] text-xs">{appt.duration}m</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate" style={{ fontWeight: 500 }}>{appt.client}</div>
                  <div className="text-[#6b7280] text-xs truncate">{appt.service}</div>
                </div>
                <div className="hidden md:block text-xs text-[#6b7280] flex-shrink-0">{appt.barber.split(' ')[0]}</div>
                <div className="flex-shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs"
                    style={{
                      background: `${statusColors[appt.status]}18`,
                      color: statusColors[appt.status],
                      fontWeight: 500,
                    }}
                  >
                    {appt.status === 'in-progress' ? 'In Progress' : appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Low Stock Alerts */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-[#f59e0b]" />
                <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Low Stock</h3>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs text-[#2563EB] hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                Manage <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
              {lowStock.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-white text-xs" style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="text-[#4b5563] text-xs">{p.category}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: p.stock <= 5 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: p.stock <= 5 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'New Appt', icon: Calendar, path: '/appointments', color: '#2563EB' },
                { label: 'Checkout', icon: ShoppingBag, path: '/pos', color: '#8b5cf6' },
                { label: 'Add Client', icon: Users, path: '/clients', color: '#10b981' },
                { label: 'Reports', icon: TrendingUp, path: '/reports', color: '#f59e0b' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.04] transition-all group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${a.color}15` }}>
                    <a.icon size={16} style={{ color: a.color }} />
                  </div>
                  <span className="text-xs text-[#9ca3af] group-hover:text-white transition-colors">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

