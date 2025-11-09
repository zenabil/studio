'use client';
import { useUser } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/app/loading";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is determined
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (user && isAuthPage) {
      // If user is logged in and tries to access login/signup, redirect to home
      router.push('/');
    } else if (!user && !isAuthPage) {
      // If user is not logged in and not on an auth page, redirect to login
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

  // Render children only if auth status allows (or still loading)
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (user || isAuthPage) {
    return <>{children}</>;
  }
  
  // While redirecting, show a loader
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
    </div>
  );
}
