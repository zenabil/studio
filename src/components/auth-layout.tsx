

'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode, useMemo } from 'react';
import Loading from '@/app/loading';
import { useData } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';
import { Button } from './ui/button';

const publicPaths = ['/login', '/signup'];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { userProfile, userProfiles, isLoading: isProfileLoading } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  const adminContact = useMemo(() => {
    if (!userProfiles || userProfiles.length === 0) {
      return null;
    }
    // Find a user who is an admin
    const adminProfile = userProfiles.find(p => p.isAdmin);
    if (!adminProfile) return null;

    return {
      name: adminProfile.email.split('@')[0], // Basic name from email
      email: adminProfile.email,
      phone: (adminProfile as any)?.phone || null,
    };
  }, [userProfiles]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  
  useEffect(() => {
    if (isLoading) {
      return; 
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (user && isPublicPath) {
      router.push('/');
    } 
    else if (!user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (user && userProfile?.status === 'pending') {
      return (
          <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
              <Card className="max-w-md text-center">
                  <CardHeader>
                    <CardTitle>{t.auth.pendingApprovalTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>{t.auth.pendingApprovalDescription}</p>
                    <p className="text-sm text-muted-foreground">{t.auth.pendingApprovalContact}</p>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
                      {adminContact && (adminContact.email || adminContact.phone) && (
                        <>
                           <h3 className="text-sm font-semibold text-foreground w-full text-center">{t.auth.adminContact}</h3>
                            {adminContact.email && (
                                <a href={`mailto:${adminContact.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4" />
                                    <span>{adminContact.email}</span>
                                </a>
                            )}
                            {adminContact.phone && (
                                <a href={`tel:${adminContact.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <Phone className="h-4 w-4" />
                                    <span>{adminContact.phone}</span>
                                </a>
                            )}
                        </>
                      )}
                      <Button onClick={() => router.push('/login')} className="w-full mt-4">{t.auth.loginLink}</Button>
                  </CardFooter>
              </Card>
          </div>
      );
  }
  
  if (user && userProfile?.subscriptionEndsAt && new Date(userProfile.subscriptionEndsAt) < new Date()) {
      return (
          <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
              <Card className="max-w-md text-center">
                  <CardHeader>
                      <CardTitle>{t.auth.subscriptionExpiredTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <CardDescription>{t.auth.subscriptionExpiredDescription}</CardDescription>
                      <p className="text-sm text-muted-foreground mt-4">{t.auth.subscriptionExpiredContact}</p>
                  </CardContent>
                  <CardFooter>
                      <Button onClick={() => router.push('/login')} className="w-full">{t.auth.loginLink}</Button>
                  </CardFooter>
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
