import React from 'react';
import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Calculator, 
  Users, 
  UserPen, 
  Wallet, 
  Package, 
  Megaphone, 
  BarChart3, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'receptionist', 'barber'] },
  { name: 'Appointments', path: '/appointments', icon: CalendarDays, roles: ['admin', 'manager', 'receptionist', 'barber'] },
  { name: 'Point of Sale', path: '/pos', icon: Calculator, roles: ['admin', 'manager', 'receptionist'] },
  { name: 'Clients', path: '/clients', icon: Users, roles: ['admin', 'manager', 'receptionist'] },
  { name: 'Staff', path: '/staff', icon: UserPen, roles: ['admin', 'manager'] },
  { name: 'Payroll', path: '/payroll', icon: Wallet, roles: ['admin', 'manager', 'barber'] },
  { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin', 'manager', 'receptionist'] },
  { name: 'Marketing', path: '/marketing', icon: Megaphone, roles: ['admin', 'manager'] },
  { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'manager'] },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    // Clear any persisted auth artifacts here in a real app
  };

  // Filter navigation items based on user role
  const filteredNavItems = NAV_ITEMS.filter(item => 
    user ? item.roles.includes(user.role) : false
  );

  const NavLinks = () => (
    <div className="flex flex-col space-y-1 w-full">
      {filteredNavItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors border ${
              isActive 
                ? 'bg-primary/10 text-primary border-primary/20 font-medium' 
                : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-dvh w-full bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full border-r bg-white flex-shrink-0">
        <div className="flex items-center justify-center h-16 border-b px-4">
          <h1 className="text-xl font-bold tracking-tight text-primary">BarberOS</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-9 h-9 border">
                <AvatarFallback className="bg-primary/10 text-primary uppercase">
                  {user?.fullName?.substring(0, 2) || 'US'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground capitalize mt-1">{user?.role}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-14 border-b bg-white px-4 flex-shrink-0">
          <h1 className="text-lg font-bold text-primary">BarberOS</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 flex flex-col p-0">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary uppercase">
                      {user?.fullName?.substring(0, 2) || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-medium">{user?.fullName}</h4>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <NavLinks />
              </div>
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full text-red-600" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};
