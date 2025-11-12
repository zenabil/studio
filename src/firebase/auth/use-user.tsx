

'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import type { UserProfile } from '@/contexts/data-context';
import { WithId } from '@/lib/utils';

export interface UseUserResult {
  user: User | null;
  firebaseApp: any;
  userProfile: WithId<UserProfile> | null;
  isUserLoading: boolean;
}

export function useUser(): UseUserResult {
  const { auth, firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const userProfileDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, `userProfiles/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileDocRef);

  const userProfile = useMemo(() => {
    if (!userProfileData) return null;
    
    return {
      ...userProfileData,
      id: userProfileData.id,
      email: userProfileData.email,
      status: userProfileData.status || 'pending',
      isAdmin: !!userProfileData.isAdmin,
      createdAt: userProfileData.createdAt,
      subscriptionEndsAt: userProfileData.subscriptionEndsAt,
    };
  }, [userProfileData]);
  
  const isUserLoading = useMemo(() => {
    // If auth is loading, we are definitely loading.
    if (isAuthLoading) return true;
    // If there is a user, we must wait for their profile to finish loading.
    if (user) return isProfileLoading;
    // If there is no user and auth is not loading, we are done.
    return false;
  }, [isAuthLoading, user, isProfileLoading]);


  return {
    user,
    firebaseApp,
    userProfile,
    isUserLoading,
  };
}
