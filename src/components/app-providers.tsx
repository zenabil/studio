'use client';
import { LanguageProvider } from '@/contexts/language-context';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </LanguageProvider>
  );
}
