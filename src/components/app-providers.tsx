'use client';
import { LanguageProvider } from '@/contexts/language-context';
import { DataProvider } from '@/contexts/data-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsProvider } from '@/contexts/settings-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
            <DataProvider>
              <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
            </DataProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}
