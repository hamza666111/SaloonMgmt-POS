import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { TwoFactorPage } from './pages/TwoFactorPage';
import { BranchSelectorPage } from './pages/BranchSelectorPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { POSPage } from './pages/POSPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { StaffPage } from './pages/StaffPage';
import { PayrollPage } from './pages/PayrollPage';
import { InventoryPage } from './pages/InventoryPage';
import { MarketingPage } from './pages/MarketingPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
  },
  {
    path: '/2fa',
    Component: TwoFactorPage,
  },
  {
    path: '/branch-selector',
    Component: BranchSelectorPage,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, loader: () => redirect('/dashboard') },
      
      // Catch-all auth route, logic is now dynamic based on useAuthStore.hasPermission
      { 
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', Component: DashboardPage },
          { path: 'appointments', Component: AppointmentsPage },
          { path: 'clients', Component: ClientsPage },
          { path: 'clients/:id', Component: ClientProfilePage },
          { path: 'pos', Component: POSPage },
          { path: 'invoices', Component: InvoicesPage },
          { path: 'inventory', Component: InventoryPage },
          { path: 'staff', Component: StaffPage },
          { path: 'marketing', Component: MarketingPage },
          { path: 'reports', Component: ReportsPage },
          { path: 'settings', Component: SettingsPage },
          { path: 'payroll', Component: PayrollPage },
        ]
      },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/login'),
  },
]);
