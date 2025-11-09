'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import Loading from "@/app/loading";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/language-context";
import { Clock } from "lucide-react";


function PendingApprovalScreen() {
    const { t } = useLanguage();
    const { auth } = useFirebase();
    const firestore = useFirestore();

    const adminConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'config/admin') : null, [firestore]);
    const { data: adminConfig } = useDoc<{ uid: string }>(adminConfigRef);

    const adminDocRef = useMemoFirebase(() => {
        if (!firestore || !adminConfig?.uid) return null;
        return doc(firestore, 'users', adminConfig.uid);
    }, [firestore, adminConfig?.uid]);

    const { data: adminUser } = useDoc<{ email: string }>(adminDocRef);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted">
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
                        <Clock className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{t.auth.pendingApprovalTitle}</CardTitle>
                    <CardDescription>{t.auth.pendingApprovalDescription}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground">
                        {t.auth.pendingApprovalContact}
                        {adminUser?.email && <span className="font-bold text-foreground block mt-1">{adminUser.email}</span>}
                    </p>
                    <Button variant="link" onClick={() => auth.signOut()} className="mt-4">{t.auth.signOut}</Button>
                </CardContent>
            </Card>
        </div>
    )
}


export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userDoc, isLoading: isUserDocLoading } = useDoc<{ approved: boolean }>(userDocRef);

  useEffect(() => {
    if (isAuthLoading || isUserDocLoading) {
      return; // Wait until all user data is loaded
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (user && isAuthPage) {
      router.push('/');
    } else if (!user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, isAuthLoading, isUserDocLoading, router, pathname]);

  if (isAuthLoading || (user && isUserDocLoading)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  // If user is logged in but not approved and not an admin trying to access the app
  if (user && userDoc && !userDoc.approved) {
    return <PendingApprovalScreen />;
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if ((user && userDoc?.approved) || isAuthPage) {
    return <>{children}</>;
  }
  
  // While redirecting or for non-approved users, show a loader
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loading />
    </div>
  );
}
