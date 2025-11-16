import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { db } from "../lib/firebase/client";

/**
 * Remove user from OPEN bets only when they leave a group
 * This includes:
 * - Removing user from participants array
 * - Removing user's pick from picks object
 * IMPORTANT: Does NOT affect CLOSED or JUDGED bets
 */
export async function removeUserFromGroupBets(
  groupId: string,
  userId: string
): Promise<void> {
  try {
    // Query OPEN bets in this group where user is a participant
    const betsQuery = query(
      collection(db, "bets"),
      where("groupId", "==", groupId),
      where("participants", "array-contains", userId),
      where("status", "==", "OPEN")  // ONLY OPEN BETS
    );

    const betsSnapshot = await getDocs(betsQuery);

    console.log(`Found ${betsSnapshot.docs.length} open bets to remove user from`);

    // Update each bet to remove user
    const updatePromises = betsSnapshot.docs.map(async (betDoc) => {
      const betRef = doc(db, "bets", betDoc.id);
      const betData = betDoc.data();

      // Create update object
      const updates: any = {
        participants: arrayRemove(userId),
        updatedAt: new Date().toISOString(),
      };

      // Remove user's pick from picks object
      if (betData.picks && betData.picks[userId] !== undefined) {
        updates[`picks.${userId}`] = deleteField();
      }

      return updateDoc(betRef, updates);
    });

    await Promise.all(updatePromises);

    console.log(
      `Successfully removed user ${userId} from ${betsSnapshot.docs.length} open bets in group ${groupId}`
    );
  } catch (error) {
    console.error("Error removing user from open group bets:", error);
    throw error;
  }
}
