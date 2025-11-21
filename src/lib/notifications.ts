import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase/client";

interface CreateNotificationParams {
  userId: string;
  type: "friend_request" | "h2h_challenge" | "challenge_status" | "bet_result" | "bet_closing" | "judge_required" | "activity" | "group_bet_created" | "group_invite";
  title: string;
  message: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  betId?: string;
  betTitle?: string;
  friendshipId?: string;
  groupId?: string;
  groupName?: string;
  amount?: number;
  accepted?: boolean;
  won?: boolean;
  actionTaken?: boolean;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    await addDoc(collection(db, "notifications"), {
      ...params,
      read: false,
      createdAt: new Date().toISOString()
    });
    console.log(`Notification created for user ${params.userId}: ${params.title}`);
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error; // Re-throw to let caller handle
  }
}

// Specific notification creators
export async function notifyFriendRequest(recipientId: string, senderName: string, friendshipId: string) {
  await createNotification({
    userId: recipientId,
    type: "friend_request",
    title: "New Friend Request",
    message: `${senderName} sent you a friend request`,
    link: "/friends",
    fromUserName: senderName,
    friendshipId: friendshipId
  });
}

export async function notifyH2HChallenge(challengeeId: string, challengerName: string, betId: string, betTitle: string) {
  await createNotification({
    userId: challengeeId,
    type: "h2h_challenge",
    title: "New Challenge!",
    message: `${challengerName} challenged you: "${betTitle}"`,
    link: `/bets/${betId}`,
    fromUserName: challengerName,
    betId: betId,
    betTitle: betTitle
  });
}

export async function notifyBetResult(userId: string, betId: string, betTitle: string, won: boolean, amount?: number) {
  await createNotification({
    userId: userId,
    type: "bet_result",
    title: won ? "You Won!" : "Bet Resolved",
    message: won
      ? `You won $${amount || 0} on "${betTitle}"!`
      : `"${betTitle}" has been resolved`,
    link: `/bets/${betId}`,
    betId: betId,
    betTitle: betTitle,
    amount: amount
  });
}

export async function notifyBetClosingSoon(userId: string, betId: string, betTitle: string) {
  await createNotification({
    userId: userId,
    type: "bet_closing",
    title: "Bet Closing Soon!",
    message: `"${betTitle}" closes in 1 hour`,
    link: `/bets/${betId}`,
    betId: betId,
    betTitle: betTitle
  });
}

export async function notifyFriendRequestAccepted(userId: string, friendName: string) {
  await createNotification({
    userId: userId,
    type: "activity",
    title: "Friend Request Accepted",
    message: `${friendName} accepted your friend request`,
    link: "/friends",
    fromUserName: friendName
  });
}

export async function notifyGroupBetCreated(
  userId: string,
  creatorName: string,
  betId: string,
  betTitle: string,
  groupName: string,
  groupId: string
) {
  await createNotification({
    userId: userId,
    type: "group_bet_created",
    title: "New Bet in Group",
    message: `${creatorName} created "${betTitle}" in ${groupName}`,
    link: `/bets/${betId}`,
    betId: betId,
    betTitle: betTitle,
    groupId: groupId,
    groupName: groupName,
    fromUserName: creatorName
  });
}

export async function notifyGroupInvite(
  userId: string,
  inviterName: string,
  groupId: string,
  groupName: string
) {
  await createNotification({
    userId: userId,
    type: "group_invite",
    title: "Group Invitation",
    message: `${inviterName} invited you to join ${groupName}`,
    link: `/groups/${groupId}`,
    groupId: groupId,
    groupName: groupName,
    fromUserName: inviterName
  });
}

// Create "Challenge accepted/declined" notification
export async function notifyChallengeStatus(
  userId: string,
  betId: string,
  betTitle: string,
  accepted: boolean,
  responderName: string
) {
  await createNotification({
    userId: userId,
    type: "challenge_status",
    title: accepted ? "Challenge Accepted!" : "Challenge Declined",
    message: `${responderName} ${accepted ? "accepted" : "declined"} your challenge: "${betTitle}"`,
    link: `/bets/${betId}`,
    betId: betId,
    betTitle: betTitle,
    fromUserName: responderName,
    accepted: accepted
  });
}

// Create "Judge bet" notification
export async function notifyJudgeRequired(
  userId: string,
  betId: string,
  betTitle: string
) {
  try {
    // Check if notification already exists for this bet
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("betId", "==", betId),
      where("type", "==", "judge_required")
    );

    const existing = await getDocs(q);
    if (!existing.empty) {
      console.log("Judge required notification already exists");
      return;
    }

    await createNotification({
      userId: userId,
      type: "judge_required",
      title: "Judge Bet",
      message: `"${betTitle}" needs a result`,
      link: `/bets/${betId}`,
      betId: betId,
      betTitle: betTitle,
      actionTaken: false
    });
  } catch (error) {
    console.error("Error creating judge required notification:", error);
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

// Mark notification action as taken
export async function markNotificationActionTaken(notificationId: string) {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, { actionTaken: true, read: true });
  } catch (error) {
    console.error("Error marking action taken:", error);
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(docSnap =>
      updateDoc(docSnap.ref, { read: true })
    );

    await Promise.all(updates);
    console.log("All notifications marked as read");
  } catch (error) {
    console.error("Error marking all as read:", error);
  }
}
