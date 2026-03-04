import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createBranch as apiCreateBranch,
  getBranches as apiGetBranches,
  updateBranch as apiUpdateBranch,
} from '../lib/supabaseData';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

interface BranchState {
  branches: Branch[];
  activeBranchId: string;
  isLoading: boolean;
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  setActiveBranch: (id: string) => void;
  refreshBranches: () => Promise<void>;
}

const defaultBranches: Branch[] = [
  { id: 'b1111111-1111-1111-1111-111111111111', name: 'Downtown', address: '123 Main St, New York, NY 10001', isActive: true },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Midtown', address: '456 Park Ave, New York, NY 10022', isActive: true },
  { id: 'b3333333-3333-3333-3333-333333333333', name: 'Brooklyn', address: '789 Atlantic Ave, Brooklyn, NY 11217', isActive: true },
];

function getInitialActive(branches: Branch[]) {
  return branches.find(branch => branch.isActive)?.id || branches[0]?.id || defaultBranches[0].id;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: defaultBranches,
      activeBranchId: getInitialActive(defaultBranches),
      isLoading: false,

      refreshBranches: async () => {
        set({ isLoading: true });
        try {
          const fetched = await apiGetBranches();
          const branches = fetched.length > 0 ? fetched : defaultBranches;
          const currentActive = get().activeBranchId;
          const stillValid = branches.some(branch => branch.id === currentActive && branch.isActive);
          set({
            branches,
            activeBranchId: stillValid ? currentActive : getInitialActive(branches),
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      addBranch: (branch) => {
        const tempId = `temp-${Date.now()}`;
        set((state) => ({
          branches: [...state.branches, { ...branch, id: tempId }],
          activeBranchId: state.activeBranchId || tempId,
        }));

        void apiCreateBranch(branch)
          .then((created) => {
            set((state) => ({
              branches: state.branches.map(item => (item.id === tempId ? created : item)),
              activeBranchId: state.activeBranchId === tempId ? created.id : state.activeBranchId,
            }));
          })
          .catch(() => {
            set((state) => ({
              branches: state.branches.filter(item => item.id !== tempId),
              activeBranchId: getInitialActive(state.branches.filter(item => item.id !== tempId)),
            }));
          });
      },

      updateBranch: (id, updates) => {
        const previous = get().branches;

        set((state) => ({
          branches: state.branches.map(branch => (branch.id === id ? { ...branch, ...updates } : branch)),
        }));

        void apiUpdateBranch(id, updates).catch(() => {
          set({ branches: previous });
        });
      },

      setActiveBranch: (id) => {
        const exists = get().branches.some(branch => branch.id === id && branch.isActive);
        if (!exists) return;
        set({ activeBranchId: id });
      },
    }),
    {
      name: 'branch-storage',
      partialize: (state) => ({
        branches: state.branches,
        activeBranchId: state.activeBranchId,
      }),
    },
  ),
);
