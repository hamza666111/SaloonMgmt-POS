import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import { useThemeStore } from './store/useThemeStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { useBranchStore } from './store/useBranchStore';
import { initializeOfflineSync } from './lib/supabaseData';

export default function App() {
  const { mode } = useThemeStore();
  const { accentColor } = useSettingsStore();
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const refreshBranches = useBranchStore(state => state.refreshBranches);

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  const normalizeHex = (hex: string) => {
    const cleaned = hex.replace('#', '').trim();
    if (cleaned.length === 3) {
      return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
    }
    return `#${cleaned}`;
  };

  const darkenHex = (hex: string, amount = 0.12) => {
    const normalized = normalizeHex(hex);
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    const factor = 1 - amount;
    return `#${toHex(Math.max(0, Math.round(r * factor)))}${toHex(Math.max(0, Math.round(g * factor)))}${toHex(Math.max(0, Math.round(b * factor)))}`;
  };

  useEffect(() => {
    const root = document.documentElement;
    const accentStrong = darkenHex(accentColor, 0.12);
    root.style.setProperty('--primary', accentColor);
    root.style.setProperty('--primary-strong', accentStrong);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-primary', accentColor);
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  }, [mode]);

  useEffect(() => {
    void initializeAuth();
    void refreshBranches();
    initializeOfflineSync();
  }, [initializeAuth, refreshBranches]);

  const isDark = mode === 'dark';

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme={isDark ? 'dark' : 'light'}
        position="top-right"
        toastOptions={{
          style: {
            background: isDark ? '#1a1a1a' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            color: isDark ? '#fff' : '#0f172a',
            fontFamily: 'Inter, sans-serif',
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}
