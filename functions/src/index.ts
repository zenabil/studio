import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();

export const updateUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = request.auth.uid;
  const profileData = request.data;

  // Validate that the user is updating their own profile
  if (userId !== profileData.userId) {
     throw new HttpsError("permission-denied", "You can only update your own profile.");
  }
  
  // We don't want to save the userId inside the document itself
  const { userId: dataUserId, ...dataToSave } = profileData;

  const firestore = getFirestore();
  const userProfileRef = firestore.collection("userProfiles").doc(userId);

  try {
    await userProfileRef.update(dataToSave);
    return { status: "success", message: "Profile updated successfully." };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new HttpsError("internal", "An error occurred while updating the profile.");
  }
});
