import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'manager' | 'receptionist' | 'barber';

interface User {
  id: string;
  fullName: string;
  role: Role;
  branchId: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rolePermissions: Record<string, Record<string, boolean>>;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  hasPermission: (module: string, action?: string) => boolean;
  updateRolePermission: (role: string, module: string, value: boolean) => void;
}

const defaultPermissions = {
  Manager: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: true, reports: true, settings: false },
  Admin: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: true, inventory: true, marketing: true, reports: true, settings: true },
  Receptionist: { dashboard: false, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: false, reports: false, settings: false },
  Barber: { dashboard: false, appointments: true, pos: true, invoices: false, clients: true, staff: false, payroll: false, inventory: false, marketing: false, reports: false, settings: false }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      rolePermissions: defaultPermissions,

      setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      
      clearAuth: () => set({ user: null, isAuthenticated: false }),
      
      updateRolePermission: (role, module, value) => {
        set((state) => ({
          rolePermissions: {
            ...state.rolePermissions,
            [role]: {
              ...state.rolePermissions[role],
              [module]: value
            }
          }
        }));
      },

      hasPermission: (module, action) => {
        const { user, rolePermissions } = get();
        if (!user) return false;
        
        // Admin overrides all permissions
        if (user.role === 'admin') return true;
        
        const roleKey = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        
        // Check module permission from store (mapped by StaffPage toggles)
        if (rolePermissions[roleKey] && typeof rolePermissions[roleKey][module] !== 'undefined') {
            if (!rolePermissions[roleKey][module]) return false;
        }

        // Fallback for fine-grained action checks (legacy behavior)
        if (action) {
           return user.permissions.includes(`${module}:${action}`);
        }
        
        // If no action provided but module is enabled
        return rolePermissions[roleKey]?.[module] === true;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
