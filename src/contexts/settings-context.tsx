'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
  { name: 'Default', primary: { light: '180 100% 25.1%', dark: '180 100% 30%' }, accent: { light: '39 100% 50%', dark: '39 100% 50%' } },
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
      name: 'Mercurio POS',
      address: '123 Market St, Commerce City',
      phone: '555-1234',
      email: 'contact@mercuriopos.com',
    },
    currency: '$',
    theme: 'dark',
    colorPreset: 'Default',
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
          setSettingsState(s => ({...s, ...parsed}));
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
      }
    }
  }, [isClient]);

  const applyTheme = useCallback((theme: Theme, colorName: string) => {
    if (typeof window === 'undefined') return;

    // Apply theme (light/dark)
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    let currentTheme: 'light' | 'dark';

    if (theme === 'system') {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(currentTheme);
    } else {
        currentTheme = theme;
        root.classList.add(theme);
    }
    
    // Apply color preset
    const preset = colorPresets.find(p => p.name === colorName) || colorPresets[0];
    
    root.style.setProperty('--primary', preset.primary[currentTheme]);
    root.style.setProperty('--accent', preset.accent[currentTheme]);

  }, []);

  // Apply theme and colors when settings change
  useEffect(() => {
      if(isClient) {
        applyTheme(settings.theme, settings.colorPreset);
      }
  }, [settings.theme, settings.colorPreset, isClient, applyTheme]);
  
  const setSettings = (newSettings: Partial<Settings>) => {
    setSettingsState(prevSettings => {
        const updatedSettings = { ...prevSettings, ...newSettings };
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
