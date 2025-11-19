"use client";

import React, { useState } from "react";
import { getTimeRemaining } from "../utils/timeUtils";

interface ArchivedBetCardProps {
  bet: any;
  user: any;
}

function ArchivedBetCard({ bet, user }: ArchivedBetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isH2H = bet.isH2H === true;
  const { text: countdownText } = getTimeRemaining(bet.closingAt);

  // Calculate wager and pot differently for H2H vs Group
  const wager = isH2H ? (bet.betAmount ?? 0) : (bet.perUserWager ?? 0);
  const pot = isH2H ? (bet.betAmount ?? 0) * 2 : wager * (bet.participants?.length ?? 0);

  // Determine winner status
  const isWinner = isH2H
    ? bet.winnerId === user.uid
    : bet.winners?.includes(user.uid);

  const resultText = bet.status === "JUDGED" ? (isWinner ? "WON" : "LOST") : "Pending";

  const closedAt = new Date(bet.closingAt);
  const formattedClosed = closedAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Theme colors - Purple for H2H, Orange for Group
  const themeColor = isH2H ? "purple" : "orange";
  const borderColor = isH2H ? "border-purple-400/40" : "border-orange-400/40";
  const bgGradient = isH2H
    ? "from-purple-500/20 to-purple-400/10"
    : "from-orange-500/20 to-orange-400/10";

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`cursor-pointer border ${borderColor} rounded-lg bg-gradient-to-br ${bgGradient} transition-all ${
        isExpanded ? "p-4" : "p-3"
      }`}
    >
      <div className="flex justify-between items-center text-sm">
        <div>
          <p className="font-semibold text-white">{bet.title}</p>
          <p className="text-xs text-gray-400">Bet closed at {formattedClosed}</p>
        </div>
        <span
          className={`text-sm font-bold ${
            resultText === "WON"
              ? "text-green-400"
              : resultText === "LOST"
              ? "text-red-400"
              : "text-gray-300"
          }`}
        >
          {resultText}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 text-sm text-gray-300 transition-all duration-300">
          {bet.description && (
            <p className="mb-2 text-gray-200">{bet.description}</p>
          )}

          {/* H2H vs Group Display */}
          {isH2H ? (
            <>
              <div className="flex justify-between text-gray-300 mb-2">
                <span className="text-purple-400 font-semibold">
                  {bet.challengerName} v {bet.challengeeName}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Wager: ${wager.toFixed(2)}</span>
                <span>Pot: ${pot.toFixed(2)}</span>
              </div>

              {/* H2H Judged Results */}
              {bet.status === "JUDGED" && (
                <>
                  <div className="flex justify-between mt-2">
                    <span>Final Result:</span>
                    <span className="font-bold text-purple-400">
                      {bet.winningChoice || bet.actualValue}
                    </span>
                  </div>

                  {/* Show picks with checkmark */}
                  <div className="mt-3 space-y-1">
                    <div className={`flex justify-between px-2 py-1 rounded ${
                      bet.winnerId === user.uid ? 'bg-green-900/30' : 'bg-zinc-800/30'
                    }`}>
                      <span className="text-xs">You Picked: {bet.picks?.[user.uid]}</span>
                      {bet.winnerId === user.uid && (
                        <span className="text-green-500 font-bold">✓</span>
                      )}
                    </div>

                    <div className={`flex justify-between px-2 py-1 rounded ${
                      bet.winnerId !== user.uid ? 'bg-green-900/30' : 'bg-zinc-800/30'
                    }`}>
                      <span className="text-xs">
                        They Picked: {bet.picks?.[bet.winnerId === bet.challengerId ? bet.challengeeId : bet.challengerId]}
                      </span>
                      {bet.winnerId !== user.uid && (
                        <span className="text-green-500 font-bold">✓</span>
                      )}
                    </div>
                  </div>

                  {/* Payout Display */}
                  {isWinner && (
                    <div className="flex justify-between mt-2">
                      <span>Your Payout:</span>
                      <span className="font-bold text-green-400">
                        +${bet.winnerPayout?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Group Bet Display */}
              <div className="flex justify-between text-gray-300">
                <span>By {bet.creatorId?.substring(0, 8)}</span>
                <span>{countdownText}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Wager: ${wager.toFixed(2)}</span>
                <span>Pot: ${pot.toFixed(2)}</span>
              </div>
              {bet.status === "JUDGED" && (
                <>
                  <div className="flex justify-between mt-2">
                    <span>Correct Answer:</span>
                    <span className="font-bold text-orange-400">
                      {bet.correctAnswer}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span>Winners:</span>
                    <span className="font-bold">{bet.winners?.length || 0}</span>
                  </div>
                  {isWinner && (
                    <div className="flex justify-between mt-2">
                      <span>Your Payout:</span>
                      <span className="font-bold text-green-400">
                        +${bet.payoutPerWinner?.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default React.memo(ArchivedBetCard);
