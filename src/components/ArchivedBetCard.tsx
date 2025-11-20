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
              {/* For OVER_UNDER bets, show detailed breakdown */}
              {bet.type === "OVER_UNDER" && bet.actualValue !== undefined && bet.line !== undefined ? (
                <>
                  <div className="mt-3 bg-white/5 rounded-lg p-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Line:</span>
                      <span className="font-semibold text-orange-400">{bet.line}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Actual:</span>
                      <span className="font-semibold text-white">{bet.actualValue}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Result:</span>
                      <span className={`font-semibold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {bet.winningChoice}
                      </span>
                    </div>
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
              ) : (
                /* For other bet types, show simple result */
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

          {/* Show void status */}
          {bet.status === "VOID" && (
            <div className="mt-2 p-2 bg-zinc-700/30 rounded-lg">
              <p className="text-xs text-zinc-400 text-center">
                Bet Voided - {bet.voidReason || "All wagers returned"}
              </p>
              {bet.type === "OVER_UNDER" && bet.actualValue !== undefined && bet.line !== undefined && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Line:</span>
                    <span className="font-semibold text-orange-400">{bet.line}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Actual:</span>
                    <span className="font-semibold text-white">{bet.actualValue}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default React.memo(ArchivedBetCard);
