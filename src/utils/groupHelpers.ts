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
 * Remove user from all bets in a group when they leave
 * This includes:
 * - Removing user from participants array
 * - Removing user's pick from picks object
 * - Removing user from winners array (if applicable)
 */
export async function removeUserFromGroupBets(
  groupId: string,
  userId: string
): Promise<void> {
  try {
    // Query all bets in this group where user is a participant
    const betsQuery = query(
      collection(db, "bets"),
      where("groupId", "==", groupId),
      where("participants", "array-contains", userId)
    );

    const betsSnapshot = await getDocs(betsQuery);

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

      // If user was in winners array, remove them
      if (betData.winners && betData.winners.includes(userId)) {
        updates.winners = arrayRemove(userId);
      }

      return updateDoc(betRef, updates);
    });

    await Promise.all(updatePromises);

    console.log(
      `Removed user ${userId} from ${betsSnapshot.docs.length} bets in group ${groupId}`
    );
  } catch (error) {
    console.error("Error removing user from group bets:", error);
    throw error;
  }
}
