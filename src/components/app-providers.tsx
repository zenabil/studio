'use client';
import { LanguageProvider } from '@/contexts/language-context';
import { DataProvider } from '@/contexts/data-context';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DataProvider>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </DataProvider>
    </LanguageProvider>
  );
}
