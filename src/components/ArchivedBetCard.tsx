"use client";

import { useState } from "react";
import { getTimeRemaining } from "../utils/timeUtils";

interface ArchivedBetCardProps {
  bet: any;
  user: any;
}

export default function ArchivedBetCard({ bet, user }: ArchivedBetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { text: countdownText } = getTimeRemaining(bet.closingAt);
  const wager = bet.perUserWager ?? 0;
  const pot = wager * (bet.participants?.length ?? 0);
  const isWinner = bet.winners?.includes(user.uid);
  const resultText = bet.status === "JUDGED" ? (isWinner ? "WON" : "LOST") : "Pending";

  const closedAt = new Date(bet.closingAt);
  const formattedClosed = closedAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`cursor-pointer border border-orange-400/40 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-400/10 transition-all ${
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
        </div>
      )}
    </div>
  );
}