'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/data';

export interface UseUserResult {
  user: User | null;
  firebaseApp: any;
  userProfile: UserProfile | null;
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
      id: userProfileData.id,
      email: userProfileData.email,
      status: userProfileData.status || 'pending',
      isAdmin: userProfileData.isAdmin || false,
      createdAt: userProfileData.createdAt,
    };
  }, [userProfileData]);

  return {
    user,
    firebaseApp,
    userProfile,
    isUserLoading: isAuthLoading || isProfileLoading,
  };
}
