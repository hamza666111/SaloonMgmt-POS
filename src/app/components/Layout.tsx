import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, Calendar, ShoppingBag, Users, UserCheck,
  DollarSign, Package, Megaphone, BarChart2, Settings,
  LogOut, Bell, Search, ChevronDown, Menu, X, Scissors,
  ChevronLeft, ChevronRight, GitBranch, MoreHorizontal,
  ReceiptText,
  Zap,
  Moon,
  Sun
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchStore } from '../store/useBranchStore';
import { useThemeStore } from '../store/useThemeStore';
import { Switch } from './ui/switch';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: ShoppingBag, label: 'POS', path: '/pos' },
  { icon: ReceiptText, label: 'Invoices', path: '/invoices' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: UserCheck, label: 'Staff', path: '/staff' },
  { icon: DollarSign, label: 'Payroll', path: '/payroll' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Megaphone, label: 'Marketing', path: '/marketing' },
  { icon: BarChart2, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const mobileNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: ShoppingBag, label: 'POS', path: '/pos' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: MoreHorizontal, label: 'More', path: '/settings' },
];

export function Layout() {
  const { hasPermission, user, logout } = useAuthStore();
  const { branches, activeBranchId, setActiveBranch } = useBranchStore();
  const { mode, setMode } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const notifications = [
    { id: 1, text: 'Low stock: Beard Oil - Cedar', type: 'warning', time: '2m ago' },
    { id: 2, text: 'New appointment: Marcus Williams at 3PM', type: 'info', time: '8m ago' },
    { id: 3, text: 'Caleb Rogers marked as no-show', type: 'error', time: '25m ago' },
    { id: 4, text: 'Daily revenue target reached: $2,340', type: 'success', time: '1h ago' },
  ];

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US';

  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`
    : 'User';

  const handleSignOut = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex h-dvh bg-[#111111] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
        style={{ background: '#161616', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0 accent-glow">
            <Scissors size={18} color="#fff" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div>
              <span className="text-white text-[15px]" style={{ fontWeight: 700, letterSpacing: '-0.3px' }}>LUXE</span>
              <span className="text-[#2563EB] text-[15px]" style={{ fontWeight: 700, letterSpacing: '-0.3px' }}>CUT</span>
              <div className="text-[10px] text-[#6b7280]" style={{ letterSpacing: '0.08em' }}>MANAGEMENT SYSTEM</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.filter(item => item.path === '/settings' || hasPermission(item.path.replace('/', ''))).map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative ${
                isActive(path)
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-[#6b7280] hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {isActive(path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#2563EB] rounded-full" />
              )}
              <Icon size={18} strokeWidth={isActive(path) ? 2 : 1.5} className="flex-shrink-0" />
              {!collapsed && (
                <span style={{ fontWeight: isActive(path) ? 600 : 400 }}>{label}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                  {label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 space-y-0.5">
          <div className="h-px bg-white/[0.05] my-3" />
          {/* Live indicator */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#10b981] pulse-blue" />
              <span className="text-xs text-[#6b7280]">System Online</span>
            </div>
          )}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex items-center gap-2 text-[#6b7280]">
              {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {!collapsed && <span>Dark Mode</span>}
            </div>
            <Switch
              checked={mode === 'dark'}
              onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
            />
          </div>
          <button
            onClick={() => {
              void handleSignOut();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b7280] hover:bg-white/[0.04] hover:text-white transition-all"
          >
            <LogOut size={18} strokeWidth={1.5} />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[#4b5563] hover:text-[#6b7280] transition-all"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col z-10" style={{ background: '#161616', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between px-5 py-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center accent-glow">
                  <Scissors size={18} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <div><span className="text-white text-[15px]" style={{ fontWeight: 700 }}>LUXE</span><span className="text-[#2563EB] text-[15px]" style={{ fontWeight: 700 }}>CUT</span></div>
                  <div className="text-[10px] text-[#6b7280]">MANAGEMENT SYSTEM</div>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[#6b7280] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-0.5">
              {navItems.filter(item => item.path === '/settings' || hasPermission(item.path.replace('/', ''))).map(({ icon: Icon, label, path }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                    isActive(path) ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-[#6b7280] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive(path) ? 2 : 1.5} />
                  <span style={{ fontWeight: isActive(path) ? 600 : 400 }}>{label}</span>
                </button>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-white/[0.05]">
              <div className="flex items-center justify-between px-2 py-2 rounded-xl text-sm">
                <div className="flex items-center gap-2 text-[#6b7280]">
                  {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Dark Mode</span>
                </div>
                <Switch
                  checked={mode === 'dark'}
                  onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
                />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-4 lg:px-6 py-3.5" style={{ background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Mobile menu button */}
          <button
            className="lg:hidden text-[#6b7280] hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
              <input
                type="text"
                placeholder="Search clients, appointments..."
                className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#4b5563] focus:border-[#2563EB]/50 focus:bg-[#1c1c1c] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
              {/* Branch Switcher - Hidden if not admin */}
              {user?.role === 'admin' && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/[0.06] text-sm text-[#9ca3af] hover:text-white hover:bg-[#222222] transition-all"
                >
                  <GitBranch size={14} />
                  <span>{branches.find(b => b.id === activeBranchId)?.name || 'Select Branch'}</span>
                  <ChevronDown size={14} />
                </button>
                {showBranchMenu && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-xl">
                    {branches.filter(b => b.isActive).map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setActiveBranch(b.id); setShowBranchMenu(false); toast.success(`Switched to ${b.name}`); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-all ${activeBranchId === b.id ? 'text-[#2563EB] bg-[#2563EB]/10' : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04]'}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className="relative w-9 h-9 rounded-xl bg-[#1a1a1a] border border-white/[0.06] flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#222222] transition-all"
              >
                <Bell size={16} />
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB]" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden z-50 shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="text-sm text-white" style={{ fontWeight: 600 }}>Notifications</span>
                    <span className="text-xs text-[#2563EB]">Mark all read</span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          n.type === 'warning' ? 'bg-[#f59e0b]' :
                          n.type === 'error' ? 'bg-[#ef4444]' :
                          n.type === 'success' ? 'bg-[#10b981]' : 'bg-[#2563EB]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#d1d5db]">{n.text}</p>
                          <p className="text-xs text-[#4b5563] mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl bg-[#1a1a1a] border border-white/[0.06] hover:bg-[#222222] transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs text-white" style={{ fontWeight: 600 }}>{user?.fullName || 'User'}</div>
                  <div className="text-[10px] text-[#4b5563]">{roleLabel}</div>
                </div>
                <ChevronDown size={14} className="text-[#4b5563] hidden md:block" />
              </button>
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-2xl">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <div className="text-sm text-white" style={{ fontWeight: 600 }}>{user?.fullName || 'User'}</div>
                    <div className="text-xs text-[#6b7280]">{user?.email || 'No email'}</div>
                  </div>
                  {['Profile Settings', 'Billing', 'Help & Support'].map(item => (
                    <button 
                      key={item} 
                      onClick={() => {
                        navigate('/settings');
                        setShowProfile(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-white/[0.04] transition-all"
                    >
                      {item}
                    </button>
                  ))}
                  <div className="border-t border-white/[0.06]">
                    <button
                      onClick={() => {
                        void handleSignOut();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#111111' }}>
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden flex-shrink-0 flex items-center justify-around py-3 px-2" style={{ background: '#161616', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {mobileNavItems.filter(item => item.path === '/settings' || hasPermission(item.path.replace('/', ''))).map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
                isActive(path) ? 'text-[#2563EB]' : 'text-[#4b5563]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive(path) ? 2 : 1.5} />
              <span className="text-[10px]" style={{ fontWeight: isActive(path) ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showProfile || showBranchMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowProfile(false); setShowBranchMenu(false); }}
        />
      )}
    </div>
  );
}
