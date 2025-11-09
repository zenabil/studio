'use client';

import { SidebarNav } from '@/components/sidebar-nav';
import { useSidebar } from '@/components/ui/sidebar';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import React from 'react';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';
import Loading from '@/app/loading';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const { dir } = useLanguage();
  const { isUserLoading } = useUser();
  const pathname = usePathname();

  if (isUserLoading && pathname !== '/login' && pathname !== '/signup') {
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loading />
        </div>
    );
  }

  // Render children without the main app layout for auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SidebarNav />
       <main className={cn(
        "flex-1 flex-col transition-all duration-300 ease-in-out",
        dir === 'ltr' ? (state === 'expanded' ? 'md:ml-64' : 'md:ml-16') : (state === 'expanded' ? 'md:mr-64' : 'md:mr-16')
      )}>
        <div className="p-4 md:p-8 mt-14 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
