'use client';

import React from 'react';

export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'CHALLENGE_REQUEST'
  | 'CLOSE_SOON'
  | 'WON'
  | 'LOST'
  | 'PAYMENT_REQUEST';

export interface Notification {
  id: string;
  type: NotificationType;
  senderName?: string;
  betTitle?: string;
  amount?: number;
  timestamp: string; // e.g., "2m ago", "15m ago"
  betId?: string;
  friendRequestId?: string;
  isRead?: boolean;
}

interface NotificationCardProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

export default function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
  };

  const getNotificationLabel = () => {
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return 'Friend Request';
      case 'CHALLENGE_REQUEST':
        return 'Challenge Request';
      case 'CLOSE_SOON':
        return 'Close Soon';
      case 'WON':
        return 'Won';
      case 'LOST':
        return 'Lost';
      case 'PAYMENT_REQUEST':
        return '$ Request';
      default:
        return '';
    }
  };

  const getNotificationMessage = () => {
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return `${notification.senderName} sent you a friend request`;

      case 'CHALLENGE_REQUEST':
        return `${notification.senderName} challenged you to a bet: ${notification.betTitle}`;

      case 'CLOSE_SOON':
        return `${notification.betTitle} closes in 1 hour - Vote now!`;

      case 'WON':
        return `You won ${notification.betTitle} - Collect $${notification.amount?.toFixed(2)}!`;

      case 'LOST':
        return `You lost ${notification.betTitle} - Pay $${notification.amount?.toFixed(2)} to ${notification.senderName}`;

      case 'PAYMENT_REQUEST':
        return `${notification.senderName} requested $${notification.amount?.toFixed(2)} for ${notification.betTitle}`;

      default:
        return '';
    }
  };

  return (
    <div className="w-full">
      {/* Label */}
      <div className="text-[10px] font-semibold text-white/50 mb-2 font-montserrat">
        {getNotificationLabel()}
      </div>

      {/* Card */}
      <div
        onClick={handleClick}
        className={`
          w-full
          bg-zinc-800
          rounded-lg
          px-4 py-4
          cursor-pointer
          transition-all
          duration-200
          hover:bg-zinc-700
          ${notification.isRead === false ? 'border-l-4 border-[#ff6b35]' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Message */}
          <p className="text-[14px] font-semibold text-white leading-tight font-montserrat flex-1">
            {getNotificationMessage()}
          </p>

          {/* Timestamp */}
          <span className="text-[12px] font-semibold text-white/60 whitespace-nowrap font-montserrat">
            {notification.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
