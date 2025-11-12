

'use client';

import { useUser } from '@/firebase/auth/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import Loading from '@/app/loading';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminContactInfo } from './admin-contact-info';

const publicPaths = ['/login', '/signup'];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading, userProfile } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  
  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (user && isPublicPath) {
      router.push('/');
    } 
    else if (!user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (user) {
    const isSubscriptionExpired = userProfile?.subscriptionEndsAt && new Date(userProfile.subscriptionEndsAt) < new Date();

    if (userProfile?.status === 'pending' || isSubscriptionExpired) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
                <Card className="max-w-md text-center">
                    <CardHeader>
                      <CardTitle>
                        {userProfile?.status === 'pending'
                            ? t.auth.pendingApprovalTitle
                            : t.auth.subscriptionExpiredTitle
                        }
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <CardDescription>
                         {userProfile?.status === 'pending'
                            ? t.auth.pendingApprovalDescription
                            : t.auth.subscriptionExpiredDescription
                         }
                       </CardDescription>
                      <p className="text-sm text-muted-foreground">
                         {userProfile?.status === 'pending'
                            ? t.auth.pendingApprovalContact
                            : t.auth.subscriptionExpiredContact
                         }
                      </p>
                    </CardContent>
                    <AdminContactInfo />
                </Card>
            </div>
        );
    }
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
