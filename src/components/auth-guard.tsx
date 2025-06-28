'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ActivationProvider } from './activation-provider';
import { SidebarProvider } from './ui/sidebar';
import { AppLayout } from './app-layout';
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


export function AuthGuard({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated && pathname !== '/login') {
                router.replace('/login');
            }
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading || (!isAuthenticated && pathname !== '/login')) {
        return <FullScreenLoader />;
    }

    if (pathname === '/login') {
        return <>{children}</>; // Render the login page without the main layout
    }
    
    // User is authenticated and not on login page, render the main app layout
    return (
        <ActivationProvider>
            <SidebarProvider>
                <AppLayout>{children}</AppLayout>
            </SidebarProvider>
        </ActivationProvider>
    );
}
