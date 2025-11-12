
'use client';

import { useMemo } from 'react';
import { useData } from '@/contexts/data-context';
import { useLanguage } from '@/contexts/language-context';
import { CardFooter } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export function AdminContactInfo() {
  const { userProfiles, isLoading: isDataLoading } = useData();
  const { t } = useLanguage();

  const adminContact = useMemo(() => {
    if (!userProfiles || userProfiles.length === 0) {
      return null;
    }
    const adminProfile = userProfiles.find(p => p.isAdmin);
    if (!adminProfile) return null;

    return {
      name: adminProfile.email.split('@')[0],
      email: adminProfile.email,
      phone: (adminProfile as any)?.phone || null,
    };
  }, [userProfiles]);

  if (isDataLoading) {
    return (
       <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
          <Skeleton className="h-5 w-3/4 mx-auto" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
       </CardFooter>
    )
  }

  return (
    <CardFooter className="flex-col items-start gap-4 pt-4 border-t">
      {adminContact && (adminContact.email || adminContact.phone) ? (
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
      ) : (
        <p className="text-sm text-muted-foreground w-full text-center">{t.auth.pendingApprovalContact}</p>
      )}
      <Button onClick={() => window.location.href = '/login'} className="w-full mt-4">{t.auth.loginLink}</Button>
    </CardFooter>
  );
}
