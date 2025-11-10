import { initializeApp, getApp, getApps, type FirebaseApp, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config'; 

// This function will throw an error if the required environment variables are not set.
function getAdminAppOptions(): AppOptions {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK configuration error: Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  return {
    credential: {
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    },
  };
}

function getFirebaseAdmin(): { app: FirebaseApp; auth: Auth; firestore: Firestore } {
  if (getApps().length) {
    const app = getApp();
    return { app, auth: getAuth(app), firestore: getFirestore(app) };
  }
  
  // This will throw if the environment variables are not set.
  const options = getAdminAppOptions();
  const app = initializeApp(options);

  return { app, auth: getAuth(app), firestore: getFirestore(app) };
}

export { getFirebaseAdmin };
