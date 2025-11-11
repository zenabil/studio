'use server';

import { getFirebaseAdmin } from '@/firebase/server';

export async function getBackupData(userId: string) {
  const { firestore } = getFirebaseAdmin();
  if (!userId) {
    throw new Error('User ID is required for data backup.');
  }

  const collectionsToBackup = [
    'products',
    'customers',
    'sales',
    'bakeryOrders',
    'suppliers',
    'supplierInvoices',
    'expenses',
    'purchaseOrders',
  ];

  const backupData: { [key: string]: any[] } = {};

  for (const collectionName of collectionsToBackup) {
    const collRef = firestore.collection(`users/${userId}/${collectionName}`);
    const snapshot = await collRef.get();
    backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  return backupData;
}
