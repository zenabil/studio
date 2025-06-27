'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of your settings
export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface ColorPreset {
  name: string;
  primary: { light: string; dark: string };
  accent: { light: string; dark: string };
}

export interface Settings {
  companyInfo: CompanyInfo;
  currency: string;
  theme: Theme;
  colorPreset: string; // name of the preset
  paymentTermsDays: number;
}

// Define the context type
interface SettingsContextType {
  settings: Settings;
  setSettings: (newSettings: Partial<Settings>) => void;
  colorPresets: ColorPreset[];
}

const SETTINGS_KEY = 'mercurio-pos-settings';

const colorPresets: ColorPreset[] = [
  { name: 'Teal', primary: { light: '180 100% 25.1%', dark: '180 100% 30%' }, accent: { light: '39 100% 50%', dark: '39 100% 50%' } },
  { name: 'Green', primary: { light: '142.1 76.2% 36.3%', dark: '142.1 76.2% 46.3%' }, accent: { light: '142.1 70.2% 46.3%', dark: '142.1 70.2% 56.3%' } },
  { name: 'Blue', primary: { light: '217.2 91.2% 52.8%', dark: '217.2 91.2% 59.8%' }, accent: { light: '217.2 81.2% 62.8%', dark: '217.2 81.2% 69.8%' } },
  { name: 'Rose', primary: { light: '346.8 77.2% 49.8%', dark: '346.8 77.2% 59.8%' }, accent: { light: '346.8 67.2% 59.8%', dark: '346.8 67.2% 69.8%' } },
  { name: 'Orange', primary: { light: '24.6 95% 53.1%', dark: '24.6 95% 58.1%' }, accent: { light: '24.6 85% 63.1%', dark: '24.6 85% 68.1%' } },
];


// Create the context with a default value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isClient, setIsClient] = useState(false);
  const [settings, setSettingsState] = useState<Settings>({
    companyInfo: {
      name: 'Frucio',
      address: '123 Market St, Commerce City',
      phone: '555-1234',
      email: 'contact@propos.com',
    },
    currency: '$',
    theme: 'light',
    colorPreset: 'Teal',
    paymentTermsDays: 30,
  });
  
  useEffect(() => {
      setIsClient(true);
  }, []);

  // Load settings from localStorage on initial client render
  useEffect(() => {
    if (isClient) {
      try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          // Deep merge to ensure no fields are undefined from older versions of settings
          setSettingsState(prevSettings => {
            const newSettings = { ...prevSettings, ...parsed };
            if (parsed.companyInfo) {
              newSettings.companyInfo = { ...prevSettings.companyInfo, ...parsed.companyInfo };
            }
            return newSettings;
          });
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
      }
    }
  }, [isClient]);

  // Apply theme and colors when settings change
  useEffect(() => {
    if (!isClient) return;

    const root = document.documentElement;

    // Define a function to apply color preset based on light/dark
    const applyColorPreset = (effectiveTheme: 'light' | 'dark') => {
      const preset = colorPresets.find(p => p.name === settings.colorPreset) || colorPresets[0];
      root.style.setProperty('--primary', preset.primary[effectiveTheme]);
      root.style.setProperty('--accent', preset.accent[effectiveTheme]);
    };

    // Handle theme (light/dark/system)
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e: MediaQueryListEvent | { matches: boolean }) => {
        const isDark = e.matches;
        const effectiveTheme = isDark ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
        applyColorPreset(effectiveTheme);
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      // Initial call
      handleSystemThemeChange(mediaQuery);

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(settings.theme);
      applyColorPreset(settings.theme);
    }
  }, [settings, isClient]);
  
  const setSettings = (newSettings: Partial<Settings>) => {
    setSettingsState(prevSettings => {
        // Deep merge for companyInfo to avoid overwriting nested fields
        const updatedSettings = {
            ...prevSettings,
            ...newSettings,
            companyInfo: {
                ...prevSettings.companyInfo,
                ...(newSettings.companyInfo || {}),
            }
        };

        if (isClient) {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
            } catch (error) {
                console.error("Failed to save settings to localStorage", error);
            }
        }
        return updatedSettings;
    });
  };

  const value = { settings, setSettings, colorPresets };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
