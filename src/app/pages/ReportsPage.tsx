import { useState } from 'react';
import {
  Download, TrendingUp, DollarSign, Users, Calendar,
  BarChart2, ChevronDown, ArrowUpRight, FileText
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { monthlyRevenue, revenueData, servicePopularityData, mockStaff } from '../data/mockData';
import { toast } from 'sonner';

const reportTypes = [
  { label: 'Daily Sales', icon: DollarSign },
  { label: 'Staff Performance', icon: Users },
  { label: 'Service Trends', icon: TrendingUp },
  { label: 'Tax Report', icon: FileText },
];

const staffPerformanceData = mockStaff.slice(0, 4).map(s => ({
  name: s.name.split(' ')[0],
  revenue: s.revenue,
  appointments: s.appointments,
  tips: s.tips,
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-[#9ca3af] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-white" style={{ fontWeight: 600 }}>
            {p.name}: {typeof p.value === 'number' && p.name !== 'appointments' ? `$${p.value.toLocaleString()}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState('Daily Sales');
  const [dateRange, setDateRange] = useState('This Week');

  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const avgMonthly = totalRevenue / monthlyRevenue.length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Reports & Analytics</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#9ca3af] focus:border-[#2563EB]/50 transition-all appearance-none"
            >
              {['Today', 'This Week', 'This Month', 'Last 3 Months', 'This Year'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none" />
          </div>
          <button
            onClick={() => toast.success('Report exported to PDF')}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reportTypes.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActiveReport(label)}
            className="flex items-center gap-3 p-4 rounded-2xl transition-all text-left"
            style={{
              background: activeReport === label ? 'rgba(37,99,235,0.1)' : '#1a1a1a',
              border: activeReport === label ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: activeReport === label ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)' }}>
              <Icon size={16} style={{ color: activeReport === label ? '#2563EB' : '#6b7280' }} />
            </div>
            <span className="text-sm" style={{ color: activeReport === label ? '#fff' : '#9ca3af', fontWeight: activeReport === label ? 600 : 400 }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(0)}k`, change: '+18.2%', up: true, color: '#2563EB' },
          { label: 'Avg / Month', value: `$${(avgMonthly / 1000).toFixed(1)}k`, change: '+5.4%', up: true, color: '#10b981' },
          { label: 'Total Services', value: '567', change: '+24 this week', up: true, color: '#8b5cf6' },
          { label: 'Tax Collected', value: '$3,891', change: '8.5% rate', up: null, color: '#f59e0b' },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-xl mb-0.5" style={{ color: card.color, fontWeight: 700 }}>{card.value}</div>
            <div className="text-white text-xs mb-0.5" style={{ fontWeight: 500 }}>{card.label}</div>
            <div className={`text-xs flex items-center gap-1 ${card.up === true ? 'text-[#10b981]' : card.up === false ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
              {card.up !== null && <ArrowUpRight size={11} style={{ transform: card.up ? 'none' : 'rotate(180deg)' }} />}
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Revenue Trend</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">Monthly overview</p>
            </div>
            <button onClick={() => toast.success('Chart exported')} className="text-xs text-[#2563EB] flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Service Mix */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Service Mix</h3>
          <div className="flex justify-center">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={servicePopularityData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {servicePopularityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {servicePopularityData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-[#9ca3af]">{item.name}</span>
                </div>
                <span className="text-xs text-white" style={{ fontWeight: 600 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Staff Performance</h3>
          <button onClick={() => toast.success('Staff report exported')} className="text-xs text-[#2563EB] flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={staffPerformanceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" fill="#2563EB" radius={[6, 6, 0, 0]} />
            <Bar dataKey="tips" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" /><span className="text-xs text-[#6b7280]">Service Revenue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" /><span className="text-xs text-[#6b7280]">Tips</span></div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Daily Breakdown — This Week</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 4 }} />
            <Line type="monotone" dataKey="appointments" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
