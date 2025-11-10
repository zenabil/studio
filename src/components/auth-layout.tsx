'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode, useMemo } from 'react';
import Loading from '@/app/loading';
import { useData } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail, Phone, ShieldX } from 'lucide-react';
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
    const adminProfile = userProfiles.find(p => p.isAdmin);
    if (!adminProfile) return null;

    // Find the customer data that might match the admin's email to get phone number
    const adminCustomerData = userProfiles.find(c => c.email === adminProfile.email);

    return {
      name: adminProfile.email.split('@')[0], // Basic name from email
      email: adminProfile.email,
      phone: (adminCustomerData as any)?.phone || null,
    };
  }, [userProfiles]);

  const isLoading = isUserLoading || (user && isProfileLoading);
  
  useEffect(() => {
    // This effect handles redirection logic once loading is complete.
    if (isLoading) {
      return; 
    }

    const isPublicPath = publicPaths.includes(pathname);

    // If user is logged in and tries to access a public path like /login, redirect to home
    if (user && isPublicPath) {
      router.push('/');
    } 
    // If user is not logged in and not on a public path, redirect to login
    else if (!user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isLoading, router, pathname]);

  // General loading state for auth or initial profile fetch
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  // If user is logged in but their profile is not yet approved
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
                  {adminContact && (adminContact.email || adminContact.phone) && (
                    <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
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
                        <Button onClick={() => router.push('/login')} className="w-full mt-4">{t.auth.loginLink}</Button>
                    </CardFooter>
                  )}
              </Card>
          </div>
      );
  }
  
  // Unauthorized access to admin pages
  if (user && userProfile && !userProfile.isAdmin && pathname === '/users') {
     return (
       <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
         <Card className="w-full max-w-md text-center">
           <CardHeader className="items-center">
             <ShieldX className="h-12 w-12 text-destructive" />
             <CardTitle>Access Denied</CardTitle>
           </CardHeader>
           <CardContent>
             <p>You do not have the necessary permissions to view this page.</p>
           </CardContent>
           <CardFooter>
             <Button onClick={() => router.push('/')} className="w-full">
               Go to Dashboard
             </Button>
           </CardFooter>
         </Card>
       </div>
     );
  }

  // If user is logged in (and approved/authorized) OR they are on a public path, show the content.
  if (user || publicPaths.includes(pathname)) {
    return <>{children}</>;
  }
  
  // Fallback loading screen during redirects
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
    </div>
  );
}
