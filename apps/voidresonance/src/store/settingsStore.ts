import { create } from 'zustand';

const SETTINGS_KEY = 'clickerspace_settings';

export type ThemeMode = 'dark';
export type GraphicsQuality = 'high' | 'medium' | 'low';

export interface SettingsState {
  soundEnabled: boolean;
  masterVolume: number;
  ambientEnabled: boolean;
  visualEffects: boolean;
  scanLines: boolean;
  screenShake: boolean;
  floatingNumbers: boolean;
  toastNotifications: boolean;
  theme: ThemeMode;
  graphicsQuality: GraphicsQuality;
  fpsWarningDismissed: boolean;
}

export interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setMasterVolume: (v: number) => void;
  setAmbientEnabled: (v: boolean) => void;
  setVisualEffects: (v: boolean) => void;
  setScanLines: (v: boolean) => void;
  setScreenShake: (v: boolean) => void;
  setFloatingNumbers: (v: boolean) => void;
  setToastNotifications: (v: boolean) => void;
  setTheme: (v: ThemeMode) => void;
  setGraphicsQuality: (v: GraphicsQuality) => void;
  setFpsWarningDismissed: (v: boolean) => void;
  loadSettings: () => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  soundEnabled: true,
  masterVolume: 0.5,
  ambientEnabled: true,
  visualEffects: true,
  scanLines: true,
  screenShake: true,
  floatingNumbers: true,
  toastNotifications: true,
  theme: 'dark',
  graphicsQuality: 'high',
  fpsWarningDismissed: false,
};

function persist(state: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
}

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Partial<SettingsState>;
  } catch { /* ignore */ }
  return {};
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setSoundEnabled: (v) => {
    set({ soundEnabled: v });
    persist({ ...get(), soundEnabled: v });
  },
  setMasterVolume: (v) => {
    set({ masterVolume: v });
    persist({ ...get(), masterVolume: v });
  },
  setAmbientEnabled: (v) => {
    set({ ambientEnabled: v });
    persist({ ...get(), ambientEnabled: v });
  },
  setVisualEffects: (v) => {
    set({ visualEffects: v });
    persist({ ...get(), visualEffects: v });
  },
  setScanLines: (v) => {
    set({ scanLines: v });
    persist({ ...get(), scanLines: v });
  },
  setScreenShake: (v) => {
    set({ screenShake: v });
    persist({ ...get(), screenShake: v });
  },
  setFloatingNumbers: (v) => {
    set({ floatingNumbers: v });
    persist({ ...get(), floatingNumbers: v });
  },
  setToastNotifications: (v) => {
    set({ toastNotifications: v });
    persist({ ...get(), toastNotifications: v });
  },
  setTheme: (v) => {
    set({ theme: v });
    persist({ ...get(), theme: v });
  },
  setGraphicsQuality: (v) => {
    set({ graphicsQuality: v });
    persist({ ...get(), graphicsQuality: v });
  },
  setFpsWarningDismissed: (v) => {
    set({ fpsWarningDismissed: v });
    persist({ ...get(), fpsWarningDismissed: v });
  },
  loadSettings: () => {
    const saved = loadFromStorage();
    set({ ...DEFAULT_SETTINGS, ...saved });
  },
}));
