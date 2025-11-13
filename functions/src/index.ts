
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import * as functions from "firebase-functions";

initializeApp();

const db = getFirestore();

export const createPendingUser = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    const { email, password, name } = data;
  
    if (!email || !password || !name) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "email", "password", and "name" arguments.');
    }
  
    try {
      // Check if a user with that email already exists
      const existingUser = await getAuth().getUserByEmail(email).catch(() => null);
      if (existingUser) {
        // If the user exists and their profile is just pending, we don't need to do anything.
        // If they exist and are approved/revoked, we should prevent creating a new account.
         const profileRef = db.collection('userProfiles').doc(existingUser.uid);
         const profileSnap = await profileRef.get();
         if (profileSnap.exists()) {
             throw new functions.https.HttpsError('already-exists', 'This email address is already in use.');
         }
      }
  
      // Create the user in Firebase Auth
      const userRecord = await getAuth().createUser({
        email: email,
        password: password,
        displayName: name,
      });
  
      // Create the user profile document in Firestore with 'pending' status
      const profileData = {
        name: name,
        email: email,
        phone: '', // Initialize phone as empty
        createdAt: new Date().toISOString(),
        status: 'pending',
        isAdmin: false,
        subscriptionEndsAt: null
      };

      await db.collection('userProfiles').doc(userRecord.uid).set(profileData);
      
      return { status: 'success', uid: userRecord.uid };
  
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'This email address is already in use.');
        }
      console.error('Error creating pending user:', error);
      throw new functions.https.HttpsError('internal', 'An error occurred while creating the user.');
    }
});
  

export const approveUser = onCall(async (request: any) => {
    if (!request.auth || !request.auth.token.email) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
  
    const adminRef = db.collection('userProfiles').doc(request.auth.uid);
    const adminSnap = await adminRef.get();
  
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
      throw new HttpsError("permission-denied", "Only admins can approve users.");
    }
  
    const userIdToApprove = request.data.userId;
    if (!userIdToApprove) {
      throw new HttpsError("invalid-argument", "The function must be called with a 'userId' argument.");
    }

    const userProfileRef = db.collection('userProfiles').doc(userIdToApprove);
    await userProfileRef.update({ status: "approved" });
  
    return { status: "success", message: `User ${userIdToApprove} approved.` };
});

export const revokeUser = onCall(async (request: any) => {
    if (!request.auth || !request.auth.token.email) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
  
    const adminRef = db.collection('userProfiles').doc(request.auth.uid);
    const adminSnap = await adminRef.get();
  
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
        throw new HttpsError("permission-denied", "Only admins can revoke user access.");
    }
  
    const userIdToRevoke = request.data.userId;
    if (!userIdToRevoke) {
        throw new HttpsError("invalid-argument", "The function must be called with a 'userId' argument.");
    }
  
    const userProfileRef = db.collection('userProfiles').doc(userIdToRevoke);
    await userProfileRef.update({ status: "revoked" });
  
    return { status: "success", message: `User ${userIdToRevoke} access revoked.` };
});


export const updateUserProfile = onCall(async (request: any) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { userId, name, phone, photoURL } = request.data;
    
    // A user can only update their own profile.
    if (request.auth.uid !== userId) {
         throw new HttpsError("permission-denied", "You can only update your own profile.");
    }

    const userProfileRef = db.collection('userProfiles').doc(userId);
    
    const dataToUpdate: { [key: string]: any } = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (photoURL !== undefined) dataToUpdate.photoURL = photoURL;
    
    if (Object.keys(dataToUpdate).length === 0) {
        return { status: "no-op", message: "No data provided to update." };
    }

    try {
      await userProfileRef.update(dataToUpdate);
      return { status: "success", message: `User profile for ${userId} updated.` };
    } catch (error) {
       console.error("Error updating user profile:", error);
       throw new HttpsError("internal", "An error occurred while updating the profile.");
    }
});
