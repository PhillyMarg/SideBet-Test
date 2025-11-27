'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Bet {
  id: string;
  title: string;
  amount: number; // positive if owed to you, negative if you owe
}

interface Person {
  id: string;
  name: string;
  totalAmount: number; // positive if owed to you, negative if you owe
  bets: Bet[];
  isSettled: boolean;
}

interface SettlePersonCardProps {
  person: Person;
  onRequestVenmo?: (personId: string, amount: number, betIds: string[]) => void;
  onSendVenmo?: (personId: string, amount: number, betIds: string[]) => void;
  onMarkAsSettled?: (personId: string, betIds: string[]) => void;
}

export default function SettlePersonCard({
  person,
  onRequestVenmo,
  onSendVenmo,
  onMarkAsSettled,
}: SettlePersonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isOwedToYou = person.totalAmount > 0;
  const youOwe = person.totalAmount < 0;
  const isSettled = person.isSettled;

  // Determine border color
  const borderColor = isSettled
    ? 'border-gray-500'
    : isOwedToYou
    ? 'border-[#1bec09]'
    : 'border-red-500';

  const handleRequestVenmo = () => {
    if (onRequestVenmo) {
      const betIds = person.bets.map((bet) => bet.id);
      onRequestVenmo(person.id, Math.abs(person.totalAmount), betIds);
    }
  };

  const handleSendVenmo = () => {
    if (onSendVenmo) {
      const betIds = person.bets.map((bet) => bet.id);
      onSendVenmo(person.id, Math.abs(person.totalAmount), betIds);
    }
  };

  const handleMarkAsSettled = () => {
    if (onMarkAsSettled) {
      const betIds = person.bets.map((bet) => bet.id);
      onMarkAsSettled(person.id, betIds);
    }
  };

  if (!isExpanded) {
    // COLLAPSED STATE
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className={`
          w-full
          bg-zinc-900/40
          rounded-md
          p-3
          border-2
          ${borderColor}
          cursor-pointer
          transition-all
          duration-200
          hover:bg-zinc-900/60
          font-montserrat
        `}
      >
        {/* Row 1: Name and Amount/Status */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-semibold text-white uppercase">
            {person.name}
          </span>
          <div className="flex items-center gap-2">
            {isSettled ? (
              <span className="text-[12px] font-semibold text-gray-400">
                Settled
              </span>
            ) : null}
            <span
              className={`text-[12px] font-semibold ${
                isSettled
                  ? 'text-gray-400'
                  : isOwedToYou
                  ? 'text-[#1bec09]'
                  : 'text-red-500'
              }`}
            >
              {person.totalAmount >= 0 ? '+' : ''}${Math.abs(person.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Row 2: Bet count and Chevron */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#ff6b35]">
            {person.bets.length} Bet{person.bets.length !== 1 ? 's' : ''}
          </span>
          <ChevronDown className="w-[14px] h-[14px] text-white" />
        </div>
      </div>
    );
  }

  // EXPANDED STATE
  return (
    <div
      className={`
        w-full
        bg-zinc-900/40
        rounded-lg
        p-4
        border-2
        ${borderColor}
        font-montserrat
      `}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-700">
        <span className="text-[14px] font-bold text-white uppercase">
          {person.name}
        </span>
        <button onClick={() => setIsExpanded(false)}>
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Bet list */}
      <div className="space-y-2 mb-3">
        {person.bets.map((bet) => (
          <div key={bet.id} className="flex items-center justify-between">
            <span className="text-[12px] text-white">{bet.title}</span>
            <span
              className={`text-[12px] font-semibold ${
                bet.amount >= 0 ? 'text-[#1bec09]' : 'text-red-500'
              }`}
            >
              {bet.amount >= 0 ? '+' : ''}${Math.abs(bet.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-700 mb-4">
        <span className="text-[14px] font-bold text-white">Total</span>
        <span
          className={`text-[14px] font-bold ${
            isSettled
              ? 'text-gray-400'
              : isOwedToYou
              ? 'text-[#1bec09]'
              : 'text-red-500'
          }`}
        >
          {person.totalAmount >= 0 ? '+' : ''}${Math.abs(person.totalAmount).toFixed(2)}
        </span>
      </div>

      {/* Action buttons */}
      {!isSettled && (
        <div className="space-y-2">
          {isOwedToYou && (
            <button
              onClick={handleRequestVenmo}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-md transition-colors"
            >
              Request ${Math.abs(person.totalAmount).toFixed(2)} on Venmo
            </button>
          )}

          {youOwe && (
            <button
              onClick={handleSendVenmo}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-md transition-colors"
            >
              Send ${Math.abs(person.totalAmount).toFixed(2)} on Venmo
            </button>
          )}

          <button
            onClick={handleMarkAsSettled}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-[14px] font-semibold rounded-md transition-colors"
          >
            Mark as Settled
          </button>
        </div>
      )}

      {isSettled && (
        <button
          disabled
          className="w-full h-12 bg-gray-700 text-gray-400 text-[14px] font-semibold rounded-md cursor-not-allowed"
        >
          Settled
        </button>
      )}
    </div>
  );
}
