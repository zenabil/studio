

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

  // Only fetch all user profiles if the current user is an admin.
  const allUsersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.isAdmin) return null;
    return collection(firestore, `userProfiles`);
  }, [firestore, userProfile?.isAdmin]);
  
  const { data: allUserProfilesData, isLoading: areAllProfilesLoading } = useCollection<UserProfile>(allUsersCollectionRef);
  
  const isUserLoading = useMemo(() => {
    if (isAuthLoading) return true;
    if (user) {
        // If the user is an admin, we also wait for all profiles to load.
        if (userProfile?.isAdmin) {
            return isProfileLoading || areAllProfilesLoading;
        }
        // If the user is not an admin, we only wait for their own profile.
        return isProfileLoading;
    }
    return false;
  }, [isAuthLoading, user, isProfileLoading, areAllProfilesLoading, userProfile?.isAdmin]);


  return {
    user,
    firebaseApp,
    userProfile,
    userProfiles: allUserProfilesData || [],
    isUserLoading,
  };
}

