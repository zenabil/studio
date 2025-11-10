'use server';

import { getFirebaseAdmin } from '@/firebase/server';
import { collection, getDocs } from 'firebase/firestore';

export async function getBackupData(userId: string) {
  const { firestore } = getFirebaseAdmin();
  if (!userId) {
    throw new Error('User ID is required for data backup.');
  }

  const collectionsToBackup = [
    'products',
    'customers',
    'sales', // Corrected from salesHistory
    'bakeryOrders',
    'suppliers',
    'supplierInvoices',
    'expenses',
  ];

  const backupData: { [key: string]: any[] } = {};

  for (const collectionName of collectionsToBackup) {
    const collRef = collection(firestore, `users/${userId}/${collectionName}`);
    const snapshot = await getDocs(collRef);
    // Use the original collection name from the loop for the key in backupData
    backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  return backupData;
}
