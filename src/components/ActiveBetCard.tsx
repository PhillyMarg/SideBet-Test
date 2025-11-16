"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPick?: (bet: any, pick: string | number) => Promise<void>;
  onJudge?: Dispatch<SetStateAction<any>>;
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

  // Calculate estimated payout for regular bets
  const getEstimatedPayoutAfterPick = () => {
    if (!bet.picks || !user?.uid || !bet.picks[user.uid]) return 0;

    const userPick = bet.picks[user.uid];
    const wager = bet.settings?.min_bet || 10;
    const pot = wager * (bet.participants?.length || 1);

    // Count votes for each side
    const yesVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "YES" || v === "OVER"
    ).length;
    const noVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "NO" || v === "UNDER"
    ).length;

    if (userPick === "YES" || userPick === "OVER") {
      return yesVotes > 0 ? pot / yesVotes : pot;
    } else if (userPick === "NO" || userPick === "UNDER") {
      return noVotes > 0 ? pot / noVotes : pot;
    }

    return 0;
  };

  // Calculate percentage for progress bar
  const calculatePercentages = () => {
    if (!bet.picks) return { yes: 50, no: 50 };

    const picks = Object.values(bet.picks);
    const yesVotes = picks.filter((v) => v === "YES" || v === "OVER").length;
    const noVotes = picks.filter((v) => v === "NO" || v === "UNDER").length;
    const totalVotes = yesVotes + noVotes;

    if (totalVotes === 0) return { yes: 50, no: 50 };

    const yes = Math.round((yesVotes / totalVotes) * 100);
    const no = 100 - yes;

    return { yes, no };
  };

  const { yes, no } = calculatePercentages();

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

      {/* Old Style: Your Pick and Estimated Payout Display */}
      {!isH2H && userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="mt-1">
          {/* Mobile: Compact info */}
          <p className="text-[9px] sm:hidden text-gray-400 mb-1">
            Pick: <span className="font-bold text-orange-400">{bet.picks[user.uid]}</span>
            {" • "}
            Payout: <span className="font-bold text-green-400">${getEstimatedPayoutAfterPick().toFixed(2)}</span>
          </p>

          {/* Desktop: Full info */}
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400 mb-2">
              Your Pick:{" "}
              <span className="font-bold text-orange-400">
                {bet.picks[user.uid]}
              </span>
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Estimated Payout:{" "}
              <span className="font-bold text-green-400">
                ${getEstimatedPayoutAfterPick().toFixed(2)}
              </span>{" "}
              if {bet.picks[user.uid]} wins
            </p>
          </div>

          {/* Progress Bar - Smaller on mobile */}
          <div className="bg-zinc-800 rounded-lg overflow-hidden h-4 sm:h-5 flex items-center relative">
            <div
              className="bg-orange-500 h-full flex items-center justify-start px-1 sm:px-2 transition-all duration-500"
              style={{ width: `${yes}%` }}
            >
              <span className="text-white text-[9px] sm:text-[10px] font-bold">
                {bet.type === "YES_NO" ? "Yes" : "Over"} {yes}%
              </span>
            </div>

            <div
              className="bg-white h-full flex items-center justify-end px-1 sm:px-2 transition-all duration-500"
              style={{ width: `${no}%` }}
            >
              <span className="text-black text-[9px] sm:text-[10px] font-bold">
                {bet.type === "YES_NO" ? "No" : "Under"} {no}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* H2H Wager Display (arrow format kept for H2H) */}
      {isH2H && winnings && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
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
