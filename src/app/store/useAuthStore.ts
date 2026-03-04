import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRolePermissions, upsertRolePermissions } from '../lib/supabaseData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type Role = 'admin' | 'manager' | 'receptionist' | 'barber';

const DEFAULT_BRANCH_ID = 'b1111111-1111-1111-1111-111111111111';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  role: Role;
  branchId: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  rolePermissions: Record<string, Record<string, boolean>>;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
  updateRolePermission: (role: string, module: string, value: boolean) => void;
  loadRolePermissions: () => Promise<void>;
}

const defaultPermissions = {
  Manager: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: true, reports: true, settings: false },
  Admin: { dashboard: true, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: true, inventory: true, marketing: true, reports: true, settings: true },
  Receptionist: { dashboard: false, appointments: true, pos: true, invoices: true, clients: true, staff: true, payroll: false, inventory: true, marketing: false, reports: false, settings: false },
  Barber: { dashboard: false, appointments: true, pos: true, invoices: false, clients: true, staff: false, payroll: false, inventory: false, marketing: false, reports: false, settings: false },
};

let authSubscription: { unsubscribe: () => void } | null = null;

function roleDisplayName(role: Role | string) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'manager') return 'Manager';
  if (normalized === 'receptionist') return 'Receptionist';
  return 'Barber';
}

function normalizeRole(role: unknown): Role {
  const value = String(role || '').toLowerCase();
  if (value === 'admin' || value === 'manager' || value === 'receptionist' || value === 'barber') {
    return value;
  }
  return 'receptionist';
}

function deriveRoleFromEmail(email?: string | null): Role {
  const normalized = String(email || '').toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager')) return 'manager';
  if (normalized.includes('barber')) return 'barber';
  return 'receptionist';
}

async function getRoleNameById(roleId?: string | null) {
  if (!roleId || !supabase) return null;
  const { data, error } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .maybeSingle();
  if (error) return null;
  return data?.name || null;
}

async function mapSessionToUser(authUser: any): Promise<User> {
  if (!supabase || !isSupabaseConfigured) {
    const fallbackRole = deriveRoleFromEmail(authUser?.email);
    return {
      id: authUser?.id || Math.random().toString(36).slice(2, 10),
      fullName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
      email: authUser?.email,
      role: fallbackRole,
      branchId: DEFAULT_BRANCH_ID,
      permissions: [],
    };
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id,full_name,email,branch_id,role_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !profile) {
    const fallbackRole = deriveRoleFromEmail(authUser?.email);
    return {
      id: authUser?.id,
      fullName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
      email: authUser?.email,
      role: fallbackRole,
      branchId: DEFAULT_BRANCH_ID,
      permissions: [],
    };
  }

  const roleName = await getRoleNameById(profile.role_id);
  const role = normalizeRole(roleName || deriveRoleFromEmail(profile.email || authUser.email));

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email || authUser.email,
    role,
    branchId: profile.branch_id || DEFAULT_BRANCH_ID,
    permissions: [],
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      initialized: false,
      rolePermissions: defaultPermissions,

      setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false, initialized: true }),

      clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false, initialized: true }),

      initializeAuth: async () => {
        const { initialized } = get();
        if (initialized) return;

        set({ isLoading: true });

        try {
          await get().loadRolePermissions();

          if (!supabase || !isSupabaseConfigured) {
            const currentUser = get().user;
            set({
              isLoading: false,
              initialized: true,
              isAuthenticated: Boolean(currentUser),
            });
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUser = sessionData.session?.user || null;

          if (sessionUser) {
            const mappedUser = await mapSessionToUser(sessionUser);
            set({
              user: mappedUser,
              isAuthenticated: true,
              isLoading: false,
              initialized: true,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              initialized: true,
            });
          }

          if (!authSubscription) {
            const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
              const authUser = session?.user || null;
              if (!authUser) {
                set({ user: null, isAuthenticated: false, isLoading: false, initialized: true });
                return;
              }

              const mappedUser = await mapSessionToUser(authUser);
              set({ user: mappedUser, isAuthenticated: true, isLoading: false, initialized: true });
            });
            authSubscription = data.subscription;
          }
        } catch {
          set({ isLoading: false, initialized: true });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });

        if (!supabase || !isSupabaseConfigured) {
          const role = deriveRoleFromEmail(email);
          const localUser: User = {
            id: Math.random().toString(36).slice(2, 10),
            fullName: email.split('@')[0],
            email,
            role,
            branchId: DEFAULT_BRANCH_ID,
            permissions: [],
          };
          set({ user: localUser, isAuthenticated: true, isLoading: false, initialized: true });
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ isLoading: false });
          throw new Error(error.message);
        }

        const authUser = data.user;
        if (!authUser) {
          set({ isLoading: false });
          throw new Error('Unable to initialize session');
        }

        const mappedUser = await mapSessionToUser(authUser);
        set({ user: mappedUser, isAuthenticated: true, isLoading: false, initialized: true });
      },

      logout: async () => {
        if (supabase && isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        set({ user: null, isAuthenticated: false, isLoading: false, initialized: true });
      },

      requestPasswordReset: async (email: string) => {
        if (!supabase || !isSupabaseConfigured) {
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          throw new Error(error.message);
        }
      },

      loadRolePermissions: async () => {
        try {
          const permissions = await getRolePermissions();
          set({ rolePermissions: permissions });
        } catch {
          set({ rolePermissions: defaultPermissions });
        }
      },

      updateRolePermission: (role, module, value) => {
        set((state) => ({
          rolePermissions: {
            ...state.rolePermissions,
            [role]: {
              ...(state.rolePermissions[role] || {}),
              [module]: value,
            },
          },
        }));

        const current = get().rolePermissions[role] || {};
        void upsertRolePermissions({
          role,
          permissions: {
            ...current,
            [module]: value,
          },
        });
      },

      hasPermission: (module, action) => {
        const { user, rolePermissions } = get();
        if (!user) return false;

        if (user.role === 'admin') return true;

        const roleKey = roleDisplayName(user.role);
        const modulePermissions = rolePermissions[roleKey] || {};

        if (typeof modulePermissions[module] === 'boolean') {
          if (!modulePermissions[module]) return false;
        }

        if (action) {
          return user.permissions.includes(`${module}:${action}`) || modulePermissions[module] === true;
        }

        return modulePermissions[module] === true;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rolePermissions: state.rolePermissions,
      }),
    },
  ),
);
