'use client';
import { LanguageProvider } from '@/contexts/language-context';
import { DataProvider } from '@/contexts/data-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}
