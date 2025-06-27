'use client';

import { useSettings } from '@/contexts/settings-context';
import { differenceInCalendarDays } from 'date-fns';
import { ActivationOverlay } from './activation-overlay';
import { Skeleton } from './ui/skeleton';

function FullScreenLoader() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
    );
}


export function ActivationProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = useSettings();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (settings.isActivated) {
    return <>{children}</>;
  }

  const firstLaunch = settings.firstLaunchDate ? new Date(settings.firstLaunchDate) : new Date();
  const daysSinceFirstLaunch = differenceInCalendarDays(new Date(), firstLaunch);
  const trialDaysLeft = 7 - daysSinceFirstLaunch;

  if (trialDaysLeft > 0) {
    return <>{children}</>; // Still in trial
  }

  // Trial expired, show overlay
  return <ActivationOverlay />;
}
