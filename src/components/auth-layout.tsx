
'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore, useFirebase, FirebaseContextState, FirebaseContext } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useContext } from "react";
import Loading from "@/app/loading";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/language-context";
import { Clock } from "lucide-react";
import { useSettings } from "@/contexts/settings-context";


function PendingApprovalScreen() {
    const { t } = useLanguage();
    const { auth } = useFirebase();
    const firestore = useFirestore();
    const { settings } = useSettings();

    const adminConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'config/admin') : null, [firestore]);
    const { data: adminConfig } = useDoc<{ uid: string }>(adminConfigRef);

    const adminDocRef = useMemoFirebase(() => {
        if (!firestore || !adminConfig?.uid) return null;
        return doc(firestore, 'users', adminConfig.uid);
    }, [firestore, adminConfig?.uid]);

    const { data: adminUser } = useDoc<{ email: string }>(adminDocRef);

    const contactEmail = adminUser?.email;
    const contactPhone = settings.companyInfo.phone;

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
                    <p className="text-muted-foreground mb-4">
                        {t.auth.pendingApprovalContact}
                    </p>
                    <div className="space-y-2">
                        {contactEmail && (
                            <div className="text-sm">
                                <span className="font-semibold">{t.auth.email}:</span>
                                <a href={`mailto:${contactEmail}`} className="font-medium text-primary block hover:underline">{contactEmail}</a>
                            </div>
                        )}
                        {contactPhone && (
                             <div className="text-sm">
                                <span className="font-semibold">WhatsApp:</span>
                                <a href={`https://wa.me/${contactPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary block hover:underline">{contactPhone}</a>
                            </div>
                        )}
                    </div>
                    <Button variant="link" onClick={() => auth.signOut()} className="mt-6">{t.auth.signOut}</Button>
                </CardContent>
            </Card>
        </div>
    )
}


export function AuthLayout({ children }: { children: React.ReactNode }) {
  const firebaseContext = useContext(FirebaseContext);

  // If the context is not yet available, we are in a loading state.
  if (!firebaseContext) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Destructure after ensuring context is not undefined.
  const { areServicesAvailable, user, isUserLoading } = firebaseContext;
  const firestore = useFirestore(); // Safe to call now.
  const router = useRouter();
  const pathname = usePathname();

  // Show a loader if Firebase services are not yet initialized.
  if (!areServicesAvailable) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userDoc, isLoading: isUserDocLoading } = useDoc<{ approved: boolean }>(userDocRef);

  useEffect(() => {
    // We can be sure services are available here.
    if (isUserLoading || (user && isUserDocLoading)) {
      return; // Wait until all user data is loaded
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (user && isAuthPage) {
      router.push('/');
    } else if (!user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, isUserLoading, isUserDocLoading, router, pathname]);

  if (isUserLoading || (user && isUserDocLoading)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  // With public signups, we no longer need the pending approval screen.
  // We just verify the user is logged in or on an auth page.
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (user || isAuthPage) {
    return <>{children}</>;
  }
  
  // While redirecting or for non-approved users, show a loader
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loading />
    </div>
  );
}
