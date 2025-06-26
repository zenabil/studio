'use client';

import { SidebarNav } from '@/components/sidebar-nav';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isPinned, state } = useSidebar();
  
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SidebarNav />
       <main className={cn(
        "flex-1 flex-col transition-[margin-left] duration-300 ease-in-out",
        state === 'expanded' ? 'md:ml-64' : 'md:ml-16'
      )}>
        <div className="p-4 md:p-8 mt-14 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
