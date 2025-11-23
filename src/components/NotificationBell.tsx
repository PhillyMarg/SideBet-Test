"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Bell } from "lucide-react";
import NotificationPanel from "./NotificationPanel";

interface NotificationBellProps {
  userId: string;
  onAcceptChallenge?: (betId: string) => void;
  onDeclineChallenge?: (betId: string) => void;
}

export default function NotificationBell({
  userId,
  onAcceptChallenge,
  onDeclineChallenge
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  // Listen for unread notifications count
  useEffect(() => {
    if (!userId) {
      console.log('NotificationBell: No userId');
      return;
    }

    console.log('NotificationBell: Fetching unread count for user:', userId);

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('NotificationBell: Unread notification count:', snapshot.size);
        setUnreadCount(snapshot.size);
      },
      (error) => {
        console.error('NotificationBell: Error fetching unread count:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return (
    <>
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowPanel(true)}
        className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        userId={userId}
        onAcceptChallenge={onAcceptChallenge}
        onDeclineChallenge={onDeclineChallenge}
      />
    </>
  );
}
