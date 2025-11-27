import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createNotification } from './notifications';

admin.initializeApp();

// Trigger when bet status changes to CLOSED
export const onBetClosed = functions.firestore
  .document('bets/{betId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();

    // If bet just closed
    if (before.status !== 'CLOSED' && after.status === 'CLOSED') {
      const betId = context.params.betId;
      const winnerId = after.winnerId;
      const participants = after.participants || [];
      const betTitle = after.title;
      const wagerAmount = after.wagerAmount;
      const totalPot = after.totalPot;

      // Get winner info
      const winnerDoc = await admin.firestore().collection('users').doc(winnerId).get();
      const winnerName = winnerDoc.exists ? winnerDoc.data()?.displayName || 'Someone' : 'Someone';

      // Notify winner
      await createNotification({
        userId: winnerId,
        type: 'WON',
        betTitle: betTitle,
        betId: betId,
        amount: totalPot,
      });

      // Notify losers
      const losers = participants.filter((id: string) => id !== winnerId);
      for (const loserId of losers) {
        await createNotification({
          userId: loserId,
          type: 'LOST',
          betTitle: betTitle,
          betId: betId,
          amount: wagerAmount,
          senderName: winnerName,
        });
      }
    }
  });

// Trigger when bet is closing soon (run every hour)
export const checkClosingSoonBets = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find bets closing in the next hour that haven't been notified
    const betsSnapshot = await admin.firestore()
      .collection('bets')
      .where('status', '==', 'OPEN')
      .where('closingAt', '<=', oneHourFromNow.toISOString())
      .where('closingSoonNotified', '==', false)
      .get();

    const batch = admin.firestore().batch();

    for (const betDoc of betsSnapshot.docs) {
      const bet = betDoc.data();
      const participants = bet.participants || [];
      const picks = bet.picks || {};

      // Find users who haven't voted yet
      const usersWhoHaventVoted = participants.filter(
        (userId: string) => !picks[userId]
      );

      // Send notification to each user who hasn't voted
      for (const userId of usersWhoHaventVoted) {
        await createNotification({
          userId: userId,
          type: 'CLOSE_SOON',
          betTitle: bet.title,
          betId: betDoc.id,
        });
      }

      // Mark bet as notified
      batch.update(betDoc.ref, { closingSoonNotified: true });
    }

    await batch.commit();
  });

// Trigger when friend request is sent
export const onFriendRequestCreated = functions.firestore
  .document('friendRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const senderId = request.senderId;
    const receiverId = request.receiverId;

    // Get sender info
    const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
    const senderName = senderDoc.exists ? senderDoc.data()?.displayName || 'Someone' : 'Someone';

    // Notify receiver
    await createNotification({
      userId: receiverId,
      type: 'FRIEND_REQUEST',
      senderName: senderName,
      senderId: senderId,
      friendRequestId: context.params.requestId,
    });
  });

// Trigger when H2H bet is created (challenge request)
export const onH2HBetCreated = functions.firestore
  .document('bets/{betId}')
  .onCreate(async (snap, context) => {
    const bet = snap.data();

    // Only for H2H bets
    if (bet.betTheme === 'friend' && bet.friendId) {
      const creatorId = bet.creatorId;
      const friendId = bet.friendId;

      // Get creator info
      const creatorDoc = await admin.firestore().collection('users').doc(creatorId).get();
      const creatorName = creatorDoc.exists ? creatorDoc.data()?.displayName || 'Someone' : 'Someone';

      // Notify friend
      await createNotification({
        userId: friendId,
        type: 'CHALLENGE_REQUEST',
        senderName: creatorName,
        senderId: creatorId,
        betTitle: bet.title,
        betId: context.params.betId,
      });
    }
  });

// Trigger when payment is requested (someone requests money)
export const onPaymentRequested = functions.firestore
  .document('settlements/{settlementId}')
  .onCreate(async (snap, context) => {
    const settlement = snap.data();
    const requesterId = settlement.requesterId;
    const payerId = settlement.payerId;
    const amount = settlement.amount;
    const betTitle = settlement.betTitle;
    const betId = settlement.betId;

    // Get requester info
    const requesterDoc = await admin.firestore().collection('users').doc(requesterId).get();
    const requesterName = requesterDoc.exists ? requesterDoc.data()?.displayName || 'Someone' : 'Someone';

    // Notify payer
    await createNotification({
      userId: payerId,
      type: 'PAYMENT_REQUEST',
      senderName: requesterName,
      senderId: requesterId,
      betTitle: betTitle,
      betId: betId,
      amount: amount,
    });
  });
