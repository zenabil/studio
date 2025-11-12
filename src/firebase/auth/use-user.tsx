

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
    if (!userProfileData || !user) return null;
    
    return {
      ...userProfileData,
      id: user.uid,
      name: userProfileData.name || '',
      email: userProfileData.email,
      phone: userProfileData.phone || '',
      photoURL: userProfileData.photoURL || null,
      status: userProfileData.status || 'pending',
      isAdmin: !!userProfileData.isAdmin,
      createdAt: userProfileData.createdAt,
      subscriptionEndsAt: userProfileData.subscriptionEndsAt,
    };
  }, [userProfileData, user]);

  const isUserLoading = useMemo(() => {
    if (isAuthLoading) return true;
    if (user) {
        // We only care about the profile loading state if a user is logged in.
        return isProfileLoading;
    }
    // If no user, we are not loading user-specific data.
    return false;
  }, [isAuthLoading, user, isProfileLoading]);


  return {
    user,
    firebaseApp,
    userProfile,
    isUserLoading,
  };
}
