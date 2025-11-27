import * as admin from 'firebase-admin';

export interface CreateNotificationData {
  userId: string;
  type: 'FRIEND_REQUEST' | 'CHALLENGE_REQUEST' | 'CLOSE_SOON' | 'WON' | 'LOST' | 'PAYMENT_REQUEST';
  senderName?: string;
  senderId?: string;
  betTitle?: string;
  betId?: string;
  amount?: number;
  friendRequestId?: string;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  await admin.firestore().collection('notifications').add({
    ...data,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
