'use client';

import { SidebarNav } from '@/components/sidebar-nav';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isPinned } = useSidebar();

  return (
    <div className={cn("flex h-screen w-full bg-background", isPinned ? 'overflow-hidden' : '')}>
      <SidebarNav />
      <div className={cn("flex flex-1 flex-col", !isPinned && "overflow-y-auto")}>
        <main className={cn("flex-1 p-4 pt-20 md:p-6", isPinned && "overflow-y-auto")}>
          {children}
        </main>
      </div>
    </div>
  );
}
