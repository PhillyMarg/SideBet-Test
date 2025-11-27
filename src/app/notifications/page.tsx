'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import NotificationCard, { Notification } from '@/components/NotificationCard';

// Helper function to format timestamps
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';

  const now = new Date();
  const notifDate = timestamp.toDate();
  const diffMs = now.getTime() - notifDate.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setCurrentUserId(user.uid);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load notifications from Firebase
  useEffect(() => {
    if (!currentUserId) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifs: Notification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type,
            senderName: data.senderName,
            betTitle: data.betTitle,
            amount: data.amount,
            betId: data.betId,
            friendRequestId: data.friendRequestId,
            isRead: data.isRead,
            timestamp: formatTimestamp(data.createdAt),
          } as Notification;
        });
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification.isRead === false) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true,
        });

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        router.push('/friends');
        break;

      case 'CHALLENGE_REQUEST':
      case 'CLOSE_SOON':
      case 'WON':
      case 'LOST':
        if (notification.betId) {
          router.push('/home');
        }
        break;

      case 'PAYMENT_REQUEST':
        router.push('/settle');
        break;

      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] font-montserrat">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-[#1e1e1e] border-b border-zinc-800 flex items-center justify-between px-6 z-50">
          <h1 className="text-[18px] font-bold text-white tracking-wider">
            SIDEBET
          </h1>
          <Bell className="w-5 h-5 text-[#ff6b35]" />
        </div>

        {/* Loading spinner */}
        <div className="pt-24 pb-24 px-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] font-montserrat">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#1e1e1e] border-b border-zinc-800 flex items-center justify-between px-6 z-50">
        <h1 className="text-[18px] font-bold text-white tracking-wider">
          SIDEBET
        </h1>
        <Bell className="w-5 h-5 text-[#ff6b35]" />
      </div>

      {/* Content */}
      <div className="pt-24 pb-24 px-6">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] italic text-white/50">
              No notifications
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around z-50">
        <button
          onClick={() => router.push('/home')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-5 h-5 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/60">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-[8px] font-semibold text-white/60">HOME</span>
        </button>

        <button
          onClick={() => router.push('/groups')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-5 h-5 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/60">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-[8px] font-semibold text-white/60">GROUPS</span>
        </button>

        <button
          onClick={() => router.push('/friends')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-5 h-5 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/60">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-[8px] font-semibold text-white/60">FRIENDS</span>
        </button>

        <button
          onClick={() => router.push('/settle')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="w-5 h-5 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/60">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <span className="text-[8px] font-semibold text-white/60">SETTLE</span>
        </button>
      </div>
    </div>
  );
}
