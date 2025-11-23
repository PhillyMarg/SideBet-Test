"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationActionTaken
} from "@/lib/notifications";
import { Bell, Check, X, Swords, Users, TrendingUp, Clock, Gavel, Trophy } from "lucide-react";
import { motion, PanInfo } from "framer-motion";

interface Notification {
  id: string;
  userId: string;
  type: "friend_request" | "h2h_challenge" | "challenge_status" | "bet_result" | "bet_closing" | "judge_required" | "activity" | "group_bet_created" | "group_invite";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
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

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAcceptChallenge?: (betId: string) => void;
  onDeclineChallenge?: (betId: string) => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  userId,
  onAcceptChallenge,
  onDeclineChallenge
}: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  // Fetch notifications in real-time
  useEffect(() => {
    if (!userId) {
      console.log('NotificationPanel: No userId, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('NotificationPanel: Fetching notifications for user:', userId);

    // Simple query without orderBy to avoid Firestore index requirement
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('NotificationPanel: Snapshot received, document count:', snapshot.size);

        const notifs = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('NotificationPanel: Notification doc:', doc.id, data);
          return {
            id: doc.id,
            ...data
          };
        }) as Notification[];

        // Sort by createdAt in JavaScript (descending - newest first)
        const sortedNotifs = notifs.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Limit to 50 notifications
        const limitedNotifs = sortedNotifs.slice(0, 50);

        console.log('NotificationPanel: Setting notifications:', limitedNotifs.length, 'total');
        setNotifications(limitedNotifs);
        setLoading(false);
      },
      (error) => {
        console.error('NotificationPanel: Error fetching notifications:', error);
        console.error('NotificationPanel: Error code:', error.code);
        console.error('NotificationPanel: Error message:', error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(userId);
  };

  const handleNotificationClick = async (notif: Notification) => {
    await markNotificationAsRead(notif.id);

    // Navigate based on notification type
    try {
      switch (notif.type) {
        case "h2h_challenge":
        case "challenge_status":
          // H2H notifications → go to home
          router.push("/home");
          break;

        case "group_bet_created":
          // Group bet notification → go to group page
          if (notif.groupId) {
            router.push(`/groups/${notif.groupId}`);
          } else {
            router.push("/home");
          }
          break;

        case "group_invite":
          // Group invite → go to group page
          if (notif.groupId) {
            router.push(`/groups/${notif.groupId}`);
          } else {
            router.push("/home");
          }
          break;

        case "bet_closing":
        case "bet_result":
        case "judge_required":
          // Fetch bet to determine navigation
          if (notif.betId) {
            const betRef = doc(db, "bets", notif.betId);
            const betSnap = await getDoc(betRef);

            if (betSnap.exists()) {
              const bet = betSnap.data();

              // If group bet, go to group page
              if (bet.groupId) {
                router.push(`/groups/${bet.groupId}`);
              } else {
                // If H2H bet, go to home
                router.push("/home");
              }
            } else {
              // Bet not found, go to home
              router.push("/home");
            }
          } else {
            router.push("/home");
          }
          break;

        case "friend_request":
          router.push("/friends");
          break;

        default:
          // Use link if available, otherwise go to home
          if (notif.link) {
            router.push(notif.link);
          } else {
            router.push("/home");
          }
      }
    } catch (error) {
      console.error("Error navigating from notification:", error);
      router.push("/home");
    }

    onClose();
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
      console.log("Notification deleted:", notificationId);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleAccept = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationActionTaken(notif.id);
    if (notif.betId) {
      onAcceptChallenge?.(notif.betId);
    }
  };

  const handleDecline = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationActionTaken(notif.id);
    if (notif.betId) {
      onDeclineChallenge?.(notif.betId);
    }
  };

  const handleJudgeNow = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(notif.id);

    // Navigate to appropriate page based on bet type
    if (notif.betId) {
      try {
        const betRef = doc(db, "bets", notif.betId);
        const betSnap = await getDoc(betRef);

        if (betSnap.exists()) {
          const bet = betSnap.data();

          // If group bet, go to group page
          if (bet.groupId) {
            router.push(`/groups/${bet.groupId}`);
          } else {
            // If H2H bet, go to home
            router.push("/home");
          }
        } else {
          router.push("/home");
        }
      } catch (error) {
        console.error("Error navigating from judge notification:", error);
        router.push("/home");
      }
    } else {
      router.push("/home");
    }

    onClose();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <Users className="w-4 h-4 text-orange-500" />;
      case "h2h_challenge":
        return <Swords className="w-4 h-4 text-purple-500" />;
      case "challenge_status":
        return <Check className="w-4 h-4 text-blue-500" />;
      case "bet_result":
        return <Trophy className="w-4 h-4 text-green-500" />;
      case "bet_closing":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "judge_required":
        return <Gavel className="w-4 h-4 text-orange-500" />;
      case "group_bet_created":
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case "group_invite":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "activity":
        return <Bell className="w-4 h-4 text-zinc-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-[70] overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">
            Notifications
          </h2>

          <div className="flex items-center gap-3">
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-orange-500 text-sm font-medium hover:underline"
              >
                Mark All Read
              </button>
            )}

            <button
              onClick={onClose}
              className="text-white hover:text-zinc-400"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div>
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={48} className="text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onClick={() => handleNotificationClick(notif)}
                onAccept={(e) => handleAccept(notif, e)}
                onDecline={(e) => handleDecline(notif, e)}
                onJudgeNow={(e) => handleJudgeNow(notif, e)}
                onDelete={() => handleDelete(notif.id)}
                getIcon={getNotificationIcon}
                getTimeAgo={getTimeAgo}
              />
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// Notification Item Component with Swipe-to-Delete
function NotificationItem({
  notification,
  onClick,
  onAccept,
  onDecline,
  onJudgeNow,
  onDelete,
  getIcon,
  getTimeAgo
}: {
  notification: Notification;
  onClick: () => void;
  onAccept: (e: React.MouseEvent) => void;
  onDecline: (e: React.MouseEvent) => void;
  onJudgeNow: (e: React.MouseEvent) => void;
  onDelete: () => void;
  getIcon: (type: string) => React.ReactNode;
  getTimeAgo: (timestamp: string) => string;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasVibrated, setHasVibrated] = useState(false);

  const bgColor = notification.read ? "bg-zinc-900" : "bg-zinc-800/50";

  // Swipe configuration - more lenient thresholds for better UX
  const SWIPE_THRESHOLD = -180;     // Distance to delete
  const MAX_DRAG = -230;            // Maximum drag allowed
  const DELETE_VISIBLE_AT = -50;    // When delete starts showing

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(true);
    setDragX(info.offset.x);

    // Haptic feedback when reaching threshold (mobile only)
    if (info.offset.x < SWIPE_THRESHOLD && !hasVibrated) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
        setHasVibrated(true);
      }
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      setHasVibrated(false);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setHasVibrated(false);

    // Only delete if swiped past threshold
    if (info.offset.x < SWIPE_THRESHOLD) {
      onDelete();
    }
  };

  // Calculate swipe progress (0 to 1)
  const getSwipeProgress = () => {
    if (dragX > DELETE_VISIBLE_AT) return 0;
    if (dragX < SWIPE_THRESHOLD) return 1;

    const progress = Math.abs(dragX - DELETE_VISIBLE_AT) /
                    Math.abs(SWIPE_THRESHOLD - DELETE_VISIBLE_AT);
    return Math.min(progress, 1);
  };

  const swipeProgress = getSwipeProgress();
  const canDelete = swipeProgress >= 1;

  return (
    <div className="relative overflow-hidden border-b border-zinc-800">
      {/* Delete Background with Progress */}
      <div
        className="
          absolute inset-0
          flex items-center justify-end px-6
          transition-all duration-150 ease-out
        "
        style={{
          background: `linear-gradient(to left,
            rgba(194, 23, 23, ${swipeProgress}) 0%,
            rgba(194, 23, 23, ${swipeProgress * 0.8}) 100%)`,
          opacity: swipeProgress > 0 ? 1 : 0
        }}
      >
        <div
          className="flex items-center gap-2 transition-all duration-150"
          style={{
            transform: `scale(${0.85 + (swipeProgress * 0.15)}) translateX(${swipeProgress * -10}px)`,
            opacity: swipeProgress
          }}
        >
          <X
            size={24}
            className="text-white transition-transform duration-150"
            style={{
              transform: `rotate(${canDelete ? 90 : 0}deg)`
            }}
          />
          <span className="text-white font-semibold text-sm whitespace-nowrap">
            {canDelete ? 'Release to Delete' : 'Delete'}
          </span>
        </div>
      </div>

      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: MAX_DRAG, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isDragging ? undefined : 0 }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 35,
          mass: 0.5
        }}
        className={`${bgColor} p-4 cursor-pointer hover:bg-zinc-800 transition-colors relative`}
        onClick={(e) => {
          // Only trigger click if not dragging
          if (!isDragging) {
            onClick();
          }
        }}
        style={{
          touchAction: 'pan-y',
          userSelect: 'none'
        }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {getIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* H2H Challenge Notification with Accept/Decline buttons */}
            {notification.type === "h2h_challenge" && !notification.actionTaken && (
              <>
                <p className="text-white font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs mb-3">
                  {notification.message}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onDecline}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-red-700 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={onAccept}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-green-700 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </>
            )}

            {/* H2H Challenge that was already actioned */}
            {notification.type === "h2h_challenge" && notification.actionTaken && (
              <>
                <p className="text-white font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
                <p className="text-zinc-500 text-xs mt-1 italic">
                  Response sent
                </p>
              </>
            )}

            {/* Challenge Status Notification */}
            {notification.type === "challenge_status" && (
              <>
                <p className={`font-semibold text-sm mb-1 ${notification.accepted ? "text-green-500" : "text-red-500"}`}>
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
              </>
            )}

            {/* Bet Closing Soon Notification */}
            {notification.type === "bet_closing" && (
              <>
                <p className="text-amber-500 font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
              </>
            )}

            {/* Result Notification */}
            {notification.type === "bet_result" && (
              <>
                <p className={`font-semibold text-sm mb-1 ${notification.won ? "text-green-500" : "text-white"}`}>
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
              </>
            )}

            {/* Judge Required Notification */}
            {notification.type === "judge_required" && !notification.actionTaken && (
              <>
                <p className="text-white font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs mb-3">
                  {notification.message}
                </p>
                <button
                  onClick={onJudgeNow}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-xs hover:bg-orange-600 transition-colors"
                >
                  Judge Now
                </button>
              </>
            )}

            {/* Judge Required that was already actioned */}
            {notification.type === "judge_required" && notification.actionTaken && (
              <>
                <p className="text-white font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
                <p className="text-zinc-500 text-xs mt-1 italic">
                  Judged
                </p>
              </>
            )}

            {/* Other notification types (friend_request, group_bet_created, group_invite, activity) */}
            {!["h2h_challenge", "challenge_status", "bet_closing", "bet_result", "judge_required"].includes(notification.type) && (
              <>
                <p className="text-white font-semibold text-sm mb-1">
                  {notification.title}
                </p>
                <p className="text-zinc-400 text-xs">
                  {notification.message}
                </p>
              </>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 text-zinc-500 text-xs">
            {getTimeAgo(notification.createdAt)}
          </div>
        </div>

        {/* Unread Indicator */}
        {!notification.read && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </motion.div>
    </div>
  );
}
