'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import Loading from '@/app/loading';

const publicPaths = ['/login', '/signup'];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until the user's auth state is resolved
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (user && isPublicPath) {
      // If user is logged in and tries to access a public path, redirect to home
      router.push('/');
    } else if (!user && !isPublicPath) {
      // If user is not logged in and tries to access a protected path, redirect to login
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading || (!user && !publicPaths.includes(pathname))) {
    // Show a loading screen while checking auth or before redirecting to login
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (user || publicPaths.includes(pathname)) {
    // If user is logged in, or if it's a public page, render the children
    return <>{children}</>;
  }
  
  // This case should ideally not be reached due to the loading state and redirects,
  // but it's a safe fallback.
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
    </div>
  );
}
