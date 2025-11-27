"use client";

import { useState } from 'react';

interface Bet {
  id: string;
  title: string;
  amount: number;
}

interface Person {
  id: string;
  name: string;
  totalAmount: number;
  bets: Bet[];
  isSettled?: boolean;
}

interface SettlePersonCardProps {
  person: Person;
  onRequestVenmo?: () => void;
  onSendVenmo?: () => void;
  onMarkAsSettled?: () => void;
}

export default function SettlePersonCard({
  person,
  onRequestVenmo,
  onSendVenmo,
  onMarkAsSettled
}: SettlePersonCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isOwed = person.totalAmount > 0;
  const absAmount = Math.abs(person.totalAmount);

  return (
    <div className="bg-black/25 border-2 border-[#ff6b35] shadow-[2px_2px_4px_0px_#ff6b35] rounded-md p-3">
      {/* Main Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white text-[12px] font-semibold font-montserrat uppercase">
            {person.name}
          </p>
          <p className={`text-[10px] font-semibold font-montserrat ${
            isOwed ? 'text-[#1bec09]' : 'text-red-500'
          }`}>
            {isOwed ? '+' : '-'}${absAmount.toFixed(2)}
          </p>
        </div>

        <div className="flex gap-2">
          {isOwed && onRequestVenmo && (
            <button
              onClick={onRequestVenmo}
              className="px-3 py-1 bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)] text-white text-[8px] font-semibold font-montserrat rounded-md transition-colors"
            >
              REQUEST
            </button>
          )}
          {!isOwed && onSendVenmo && (
            <button
              onClick={onSendVenmo}
              className="px-3 py-1 bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)] text-white text-[8px] font-semibold font-montserrat rounded-md transition-colors"
            >
              SEND
            </button>
          )}
          {onMarkAsSettled && (
            <button
              onClick={onMarkAsSettled}
              className="px-3 py-1 bg-black/25 hover:bg-black/30 text-white text-[8px] font-semibold font-montserrat rounded-md transition-colors"
            >
              SETTLED
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 text-[#ff6b35] text-[10px] font-semibold font-montserrat"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Bet Details */}
      {expanded && person.bets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          {person.bets.map(bet => (
            <div key={bet.id} className="flex justify-between items-center py-1">
              <p className="text-white/70 text-[10px] font-montserrat">
                {bet.title}
              </p>
              <p className={`text-[10px] font-semibold font-montserrat ${
                bet.amount > 0 ? 'text-[#1bec09]' : 'text-red-500'
              }`}>
                {bet.amount > 0 ? '+' : ''}${bet.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
