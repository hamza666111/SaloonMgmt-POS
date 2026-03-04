import { create } from 'zustand';

export type CartItemType = 'service' | 'product';

export interface CartItem {
  id: string; // Service ID or Product ID
  name: string;
  type: CartItemType;
  price: number;
  quantity: number;
  barberId?: string; // For commission tracking on services
}

export interface PaymentMethod {
  method: 'cash' | 'card' | 'tap' | 'giftcard';
  amount: number;
}

interface POSState {
  cart: CartItem[];
  clientId: string | null;
  discount: number; // Fixed amount for simplicity
  taxRate: number; // e.g., 0.08 for 8%
  tip: number;
  
  // Actions
  setClient: (id: string | null) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string, type: CartItemType) => void;
  updateQuantity: (id: string, type: CartItemType, quantity: number) => void;
  setDiscount: (amount: number) => void;
  setTaxRate: (rate: number) => void;
  setTip: (amount: number) => void;
  clearCart: () => void;
  
  // Computed (will be derived in component or via getter)
  getSubtotal: () => number;
  getTotal: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  clientId: null,
  discount: 0,
  taxRate: 0.05, // Default 5% tax
  tip: 0,

  setClient: (id) => set({ clientId: id }),
  
  addItem: (newItem) => set((state) => {
    const existingIndex = state.cart.findIndex(
      (item) => item.id === newItem.id && item.type === newItem.type
    );
    
    if (existingIndex >= 0) {
      const updatedCart = [...state.cart];
      updatedCart[existingIndex].quantity += newItem.quantity;
      return { cart: updatedCart };
    }
    return { cart: [...state.cart, newItem] };
  }),

  removeItem: (id, type) => set((state) => ({
    cart: state.cart.filter((item) => !(item.id === id && item.type === type))
  })),

  updateQuantity: (id, type, quantity) => set((state) => {
    if (quantity <= 0) {
      return { cart: state.cart.filter((item) => !(item.id === id && item.type === type)) };
    }
    return {
      cart: state.cart.map((item) => 
        (item.id === id && item.type === type) ? { ...item, quantity } : item
      )
    };
  }),

  setDiscount: (amount) => set({ discount: amount }),
  setTaxRate: (rate) => set({ taxRate: rate }),
  setTip: (amount) => set({ tip: amount }),
  
  clearCart: () => set({ cart: [], clientId: null, discount: 0, tip: 0 }),

  getSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getTotal: () => {
    const state = get();
    const subtotal = state.getSubtotal();
    const afterDiscount = Math.max(0, subtotal - state.discount);
    const taxAmount = afterDiscount * state.taxRate;
    return afterDiscount + taxAmount + state.tip;
  }
}));
