import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config'; 

// This is a temporary workaround to provide a service account.
// In a real production environment, you would use environment variables
// or Application Default Credentials.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  clientEmail: `firebase-adminsdk-g5c1g@${firebaseConfig.projectId}.iam.gserviceaccount.com`,
  // In a real app, this private key would be stored securely in an environment variable.
  // For this context, we will use a placeholder.
  privateKey: process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\n...-----END PRIVATE KEY-----\n',
};

function getFirebaseAdmin(): { app: FirebaseApp; auth: Auth; firestore: Firestore } {
  if (getApps().length) {
    const app = getApp();
    return { app, auth: getAuth(app), firestore: getFirestore(app) };
  }

  const app = initializeApp({
    credential: {
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n')
    }
  });

  return { app, auth: getAuth(app), firestore: getFirestore(app) };
}

export { getFirebaseAdmin };
