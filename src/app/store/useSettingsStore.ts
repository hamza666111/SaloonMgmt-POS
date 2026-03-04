import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type BusinessInfo = {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  timezone: string;
  logoDataUrl: string;
};

type ReceiptSettings = {
  ratingUrl: string;
  qrCodeDataUrl: string;
};

interface SettingsState {
  businessInfo: BusinessInfo;
  receiptSettings: ReceiptSettings;
  accentColor: string;
  updateBusinessInfo: (patch: Partial<BusinessInfo>) => void;
  updateReceiptSettings: (patch: Partial<ReceiptSettings>) => void;
  updateAccentColor: (color: string) => void;
}

const defaultBusinessInfo: BusinessInfo = {
  name: 'LuxeCut Barbershop',
  phone: '+1 (555) 800-1234',
  email: 'info@luxecut.com',
  address: '123 Main St, New York, NY 10001',
  website: 'luxecut.com',
  timezone: 'America/New_York',
  logoDataUrl: '',
};

const defaultReceiptSettings: ReceiptSettings = {
  ratingUrl: '',
  qrCodeDataUrl: '',
};

const defaultAccentColor = '#2563EB';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      businessInfo: defaultBusinessInfo,
      receiptSettings: defaultReceiptSettings,
      accentColor: defaultAccentColor,
      updateBusinessInfo: (patch) =>
        set((state) => ({
          businessInfo: { ...state.businessInfo, ...patch },
        })),
      updateReceiptSettings: (patch) =>
        set((state) => ({
          receiptSettings: { ...state.receiptSettings, ...patch },
        })),
      updateAccentColor: (color) => set({ accentColor: color }),
    }),
    { name: 'settings-storage' }
  )
);
