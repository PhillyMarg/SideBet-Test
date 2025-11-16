"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPick?: (bet: any, pick: string | number) => Promise<void>;
  onJudge?: (bet: any) => void;
  groupName?: string;
}

export default function ActiveBetCard({ bet, user, onPick, onJudge, groupName }: ActiveBetCardProps) {
  const router = useRouter();
  const isH2H = bet.isH2H === true;

  // Calculate time until close
  const now = Date.now();
  const closingTime = new Date(bet.closingAt).getTime();
  const timeUntilClose = closingTime - now;
  const isUrgent = timeUntilClose > 0 && timeUntilClose <= 60 * 60 * 1000; // 1 hour

  // Theme color based on bet type
  const themeColor = isH2H ? "purple" : "orange";

  // Check if user has made a pick
  const userHasPicked = bet.participants?.includes(user?.uid);
  const userPick = bet.picks?.[user?.uid];

  // Calculate potential winnings for H2H
  const calculateH2HWinnings = () => {
    if (!isH2H || !bet.h2hOdds || !bet.betAmount || !userHasPicked) return null;

    const isChallenger = bet.challengerId === user?.uid;
    const baseAmount = bet.betAmount;

    if (isChallenger) {
      const wager = baseAmount * bet.h2hOdds.challenger;
      const potentialWin = baseAmount * bet.h2hOdds.challengee;
      return { wager: Math.round(wager), potentialWin: Math.round(potentialWin) };
    } else {
      const wager = baseAmount * bet.h2hOdds.challengee;
      const potentialWin = baseAmount * bet.h2hOdds.challenger;
      return { wager: Math.round(wager), potentialWin: Math.round(potentialWin) };
    }
  };

  const winnings = calculateH2HWinnings();

  // Format closing time
  const getClosingTimeDisplay = () => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (timeUntilClose > oneWeek) {
      const closingDate = new Date(bet.closingAt);
      const month = String(closingDate.getMonth() + 1).padStart(2, '0');
      const day = String(closingDate.getDate()).padStart(2, '0');
      const year = String(closingDate.getFullYear()).slice(-2);
      return `Closes ${month}/${day}/${year}`;
    }

    const days = Math.floor(timeUntilClose / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeUntilClose % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `Closes in ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      const minutes = Math.floor((timeUntilClose % (60 * 60 * 1000)) / (60 * 1000));
      return `Closes in ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} min`;
    } else {
      const minutes = Math.floor(timeUntilClose / (60 * 1000));
      return `Closes in ${minutes} min`;
    }
  };

  return (
    <div
      onClick={() => {
        // Don't navigate if this is used without onPick/onJudge (simple display mode)
        if (bet.id) {
          router.push(`/bets/${bet.id}`);
        }
      }}
      className={`
        bg-zinc-900 rounded-2xl p-4 cursor-pointer transition-all
        ${isUrgent
          ? `border-2 border-${themeColor}-500 glow-${themeColor}`
          : 'border border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      {/* H2H Header - Purple with Names */}
      {isH2H ? (
        <div className="mb-3">
          {/* H2H vs Display */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-bold text-purple-500">
              {bet.challengerName} v {bet.challengeeName}
            </p>
          </div>

          {/* H2H Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {bet.h2hStatus === "pending" && bet.challengeeId === user?.uid && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-full px-2 py-0.5 animate-pulse">
                <span className="text-[10px] text-red-500 font-bold">RESPOND NOW</span>
              </div>
            )}

            {bet.h2hStatus === "pending" && bet.challengerId === user?.uid && (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-0.5">
                <span className="text-[10px] text-amber-500 font-medium">AWAITING RESPONSE</span>
              </div>
            )}

            {bet.h2hStatus === "accepted" && (
              <div className="bg-green-500/20 border border-green-500/40 rounded-full px-2 py-0.5">
                <span className="text-[10px] text-green-500 font-medium">ACTIVE</span>
              </div>
            )}

            {/* Odds Badge */}
            {bet.h2hOdds && (
              <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-2 py-0.5">
                <span className="text-[10px] text-purple-400 font-medium">
                  {bet.h2hOdds?.challenger}:{bet.h2hOdds?.challengee}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regular Group Header - Orange */
        groupName && (
          <p className="text-xs text-orange-500 font-semibold mb-2">
            {groupName}
          </p>
        )
      )}

      {/* Bet Title */}
      <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
        {bet.title}
      </h3>

      {/* Wager → Winnings Display (H2H with odds) */}
      {winnings && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          <span className="font-semibold text-purple-400">${winnings.wager}</span>
          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="font-semibold text-green-500">${winnings.potentialWin}</span>
          <span className="text-xs text-zinc-500">({userPick})</span>
        </div>
      )}

      {/* H2H Wager Display (if haven't picked yet) */}
      {isH2H && !userHasPicked && bet.betAmount && (
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-purple-400 font-semibold">
            ${bet.betAmount} wager
          </div>
        </div>
      )}

      {/* Closing Time */}
      {bet.status === "OPEN" && (
        <div className={`text-xs ${isH2H ? 'text-purple-400' : 'text-zinc-400'}`}>
          {getClosingTimeDisplay()}
        </div>
      )}

      {/* Status for CLOSED/JUDGED */}
      {bet.status === "CLOSED" && (
        <div className="text-xs text-amber-500 font-medium">
          Awaiting Results
        </div>
      )}

      {bet.status === "JUDGED" && (
        <div className={`text-xs font-medium ${
          bet.winners?.includes(user?.uid) ? 'text-green-500' : 'text-zinc-500'
        }`}>
          {bet.winners?.includes(user?.uid) ? '✓ You Won!' : 'Completed'}
        </div>
      )}
    </div>
  );
}
