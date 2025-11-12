

'use client';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, collection } from 'firebase/firestore';
import { useAuth, useFirestore, useDoc, useMemoFirebase, useFirebase, useCollection } from '@/firebase';
import type { UserProfile } from '@/contexts/data-context';
import { WithId } from '@/lib/utils';

export interface UseUserResult {
  user: User | null;
  firebaseApp: any;
  userProfile: WithId<UserProfile> | null;
  userProfiles: WithId<UserProfile>[];
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
  
  const allUsersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `userProfiles`);
  }, [firestore]);
  
  const { data: allUserProfilesData, isLoading: areAllProfilesLoading } = useCollection<UserProfile>(allUsersCollectionRef);

  const userProfile = useMemo(() => {
    if (!userProfileData) return null;
    
    return {
      ...userProfileData,
      id: userProfileData.id,
      name: userProfileData.name || '',
      email: userProfileData.email,
      phone: userProfileData.phone || '',
      photoURL: userProfileData.photoURL || null,
      status: userProfileData.status || 'pending',
      isAdmin: !!userProfileData.isAdmin,
      createdAt: userProfileData.createdAt,
      subscriptionEndsAt: userProfileData.subscriptionEndsAt,
    };
  }, [userProfileData]);
  
  const isUserLoading = useMemo(() => {
    if (isAuthLoading) return true;
    if (user) return isProfileLoading || areAllProfilesLoading;
    return false;
  }, [isAuthLoading, user, isProfileLoading, areAllProfilesLoading]);


  return {
    user,
    firebaseApp,
    userProfile,
    userProfiles: allUserProfilesData || [],
    isUserLoading,
  };
}
