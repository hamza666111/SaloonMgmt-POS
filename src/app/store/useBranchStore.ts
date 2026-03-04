import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
}

interface BranchState {
  branches: Branch[];
  activeBranchId: string;
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  setActiveBranch: (id: string) => void;
}

const defaultBranches: Branch[] = [
  { id: 'branch-1', name: 'Downtown', address: '123 Main St', isActive: true },
  { id: 'branch-2', name: 'Midtown', address: '456 Oak St', isActive: true },
  { id: 'branch-3', name: 'Brooklyn', address: '789 Pine St', isActive: true },
];

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branches: defaultBranches,
      activeBranchId: 'branch-1',
      
      addBranch: (branch) => set((state) => ({
        branches: [...state.branches, { ...branch, id: `branch-${Date.now()}` }]
      })),
      
      updateBranch: (id, updates) => set((state) => ({
        branches: state.branches.map(b => b.id === id ? { ...b, ...updates } : b)
      })),

      setActiveBranch: (id) => set({ activeBranchId: id })
    }),
    {
      name: 'branch-storage',
    }
  )
);
