'use server';

import { getFirebaseAdmin } from '@/firebase/server';
import { collection, getDocs } from 'firebase/firestore';

export async function getBackupData() {
  const { firestore, auth } = getFirebaseAdmin();
  // We can't easily get the current user's ID on the server in this context,
  // so we assume for now this action is triggered by an admin or a specific user.
  // A more robust solution might pass the userId. For now, we need to adapt.
  // Let's assume we need to get the admin's UID first to find data.

  const adminUser = await auth.getUserByEmail('contact@propos.com').catch(() => null);
  if (!adminUser) {
    throw new Error('Admin user not found for data backup.');
  }
  const userId = adminUser.uid;

  const collectionsToBackup = [
    'products',
    'customers',
    'salesHistory',
    'bakeryOrders',
    'suppliers',
    'supplierInvoices',
    'expenses',
  ];

  const backupData: { [key: string]: any[] } = {};

  for (const collectionName of collectionsToBackup) {
    const collRef = collection(firestore, `users/${userId}/${collectionName}`);
    const snapshot = await getDocs(collRef);
    backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  return backupData;
}
