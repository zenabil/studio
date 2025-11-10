
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import Loading from '@/app/loading';
import { useData } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const publicPaths = ['/login', '/signup'];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (isLoading) {
      return; 
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (user && isPublicPath) {
      router.push('/');
    } else if (!user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || (!user && !publicPaths.includes(pathname))) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  // If user is logged in, but their profile is not approved and they are not on a public page
  if (user && userProfile?.status === 'pending' && !publicPaths.includes(pathname)) {
      return (
          <div className="flex min-h-screen w-full items-center justify-center p-4">
              <Card className="max-w-md text-center">
                  <CardHeader>
                    <CardTitle>{t.auth.pendingApprovalTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>{t.auth.pendingApprovalDescription}</p>
                    <p className="text-sm text-muted-foreground">{t.auth.pendingApprovalContact}</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (user || publicPaths.includes(pathname)) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
    </div>
  );
}
