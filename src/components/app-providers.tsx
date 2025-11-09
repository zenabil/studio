'use client';
import { LanguageProvider } from '@/contexts/language-context';
import { DataProvider } from '@/contexts/data-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsProvider } from '@/contexts/settings-context';
import { useAuth, useUser } from '@/firebase';
import { useEffect } from 'react';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

function AuthHandler({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    // If not loading and no user exists, sign in anonymously.
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  return <>{children}</>;
}


export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
          <AuthHandler>
            <DataProvider>
              <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
            </DataProvider>
          </AuthHandler>
      </SettingsProvider>
    </LanguageProvider>
  );
}
