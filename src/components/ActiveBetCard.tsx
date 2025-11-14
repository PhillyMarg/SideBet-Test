"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTimeRemaining, getLivePercentages } from "../utils/timeUtils";
import { fetchUserData, getUserDisplayName } from "../utils/userUtils";

interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPick: (bet: any, pick: string | number) => Promise<void>;
  onJudge: (bet: any) => void;
  groupName?: string;
}

function ActiveBetCard({
  bet,
  user,
  onPick,
  onJudge,
  groupName,
}: ActiveBetCardProps) {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [loadingCreator, setLoadingCreator] = useState<boolean>(true);

  const { text: countdownText, isClosed } = getTimeRemaining(bet.closingAt);
  const wager = bet.perUserWager ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  // Fetch creator data on mount
  useEffect(() => {
    const loadCreatorData = async () => {
      if (bet.creatorId) {
        setLoadingCreator(true);
        const userData = await fetchUserData(bet.creatorId);
        const displayName = getUserDisplayName(userData);
        setCreatorName(displayName);
        setLoadingCreator(false);
      }
    };

    loadCreatorData();
  }, [bet.creatorId]);

  const calculateEstimatedPayout = (side: "yes" | "no") => {
    const yesVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "YES" || v === "OVER"
    ).length;
    const noVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "NO" || v === "UNDER"
    ).length;

    const potentialYesVotes = side === "yes" ? yesVotes + 1 : yesVotes;
    const potentialNoVotes = side === "no" ? noVotes + 1 : noVotes;
    const potentialPot = (potentialYesVotes + potentialNoVotes) * wager;

    if (side === "yes") {
      return potentialYesVotes > 0 ? potentialPot / potentialYesVotes : potentialPot;
    } else {
      return potentialNoVotes > 0 ? potentialPot / potentialNoVotes : potentialPot;
    }
  };

  const getEstimatedPayoutAfterPick = () => {
    if (bet.type === "CLOSEST_GUESS") {
      return pot;
    }

    const userPick = bet.picks[user?.uid];
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

  return (
    <li
      className={`
        rounded-xl px-2 py-2 sm:px-4 sm:py-3 
        flex flex-col text-left shadow-md 
        hover:scale-[1.01] sm:hover:scale-[1.02] 
        transition-transform duration-200 
        text-xs sm:text-sm 
        w-full
        ${
          needsJudging
            ? "bg-orange-500/10 border-2 border-orange-500/50 hover:border-orange-500"
            : "bg-zinc-900 border border-zinc-800 hover:border-orange-500"
        }
      `}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {groupName && (
            <button
              onClick={() => router.push(`/groups/${bet.groupId}`)}
              className="text-[9px] sm:text-xs font-medium border border-orange-500 text-orange-400 rounded-full px-1.5 py-0.5 sm:px-2 sm:py-[2px] hover:bg-orange-500 hover:text-white transition"
            >
              {groupName}
            </button>
          )}
          <span className="text-[9px] sm:text-xs text-gray-400">
            by {loadingCreator ? bet.creatorId?.substring(0, 8) : creatorName}
          </span>
        </div>
        <span className="text-[9px] sm:text-xs font-bold text-orange-500">{countdownText}</span>
      </div>

      {/* Title */}
      <p className="font-semibold text-white mb-0.5 sm:mb-1 text-xs sm:text-sm leading-tight line-clamp-1 sm:line-clamp-2">
        {bet.title}
      </p>

      {/* Description - Hide on mobile */}
      {bet.description && (
        <p className="hidden sm:block text-sm text-gray-300 mb-3 line-clamp-2">
          {bet.description}
        </p>
      )}

      {/* Stats Row - Compact on mobile */}
      <div className="flex justify-between text-[10px] sm:text-sm text-gray-400 mb-1.5 sm:mb-4">
        <span className="sm:inline">Wager: ${wager.toFixed(2)}</span>
        <span className="hidden sm:inline">Players: {people}</span>
        <span className="font-semibold text-orange-400">Pot: ${pot.toFixed(2)}</span>
      </div>

      {/* Judge Button */}
      {needsJudging && (
        <button
          onClick={() => onJudge(bet)}
          className="w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white mb-1.5 sm:mb-3 shadow-lg transition"
        >
          ⚖️ Judge This Bet
        </button>
      )}

      {/* Betting Interface */}
      {!isClosed && (
        <>
          {userHasPicked ? (
            <>
              {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
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
              ) : bet.type === "CLOSEST_GUESS" ? (
                <div className="mt-1 flex flex-col items-center">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 mb-1 sm:mb-1.5">
                    Your Guess:{" "}
                    <span className="font-bold text-orange-400">
                      {bet.picks[user.uid]}
                    </span>
                    {" • "}
                    Payout:{" "}
                    <span className="font-bold text-green-400">
                      ${pot.toFixed(2)}
                    </span>
                  </p>

                  <button
                    onClick={() => setShowResults(!showResults)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-[11px] font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition"
                  >
                    {showResults ? "Hide Results" : "View Results"}
                  </button>

                  {showResults && (
                    <div className="w-full mt-2 bg-zinc-800 rounded-lg p-2 transition-all duration-300">
                      <p className="text-[10px] sm:text-xs font-semibold text-white mb-1.5">
                        All Guesses:
                      </p>
                      {bet.picks && Object.keys(bet.picks).length > 0 ? (
                        <ul className="space-y-0.5 text-[10px] sm:text-[11px] text-gray-300">
                          {Object.entries(bet.picks)
                            .sort(([, a]: any, [, b]: any) => {
                              const numA = parseFloat(a);
                              const numB = parseFloat(b);
                              if (!isNaN(numA) && !isNaN(numB)) {
                                return numA - numB;
                              }
                              return String(a).localeCompare(String(b));
                            })
                            .map(([userId, guess]: any) => (
                              <li key={userId} className="flex justify-between">
                                <span
                                  className={
                                    userId === user.uid
                                      ? "text-orange-400 font-semibold"
                                      : ""
                                  }
                                >
                                  {userId === user.uid ? "You" : userId.substring(0, 8)}
                                </span>
                                <span className="font-bold">{guess}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-[9px] sm:text-[10px] text-gray-500">No guesses yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
                <div className="flex gap-1.5 sm:gap-2 mt-auto">
                  <button
                    onClick={() =>
                      onPick(bet, bet.type === "YES_NO" ? "YES" : "OVER")
                    }
                    className="flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center shadow transition-all bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <span className="leading-none">{bet.type === "YES_NO" ? "Yes" : "Over"}</span>
                    <span className="text-[9px] sm:text-[10px] text-white/80 mt-0.5">
                      ${calculateEstimatedPayout("yes").toFixed(2)}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-white/60">{yes}%</span>
                  </button>
                  <button
                    onClick={() =>
                      onPick(bet, bet.type === "YES_NO" ? "NO" : "UNDER")
                    }
                    className="flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center shadow transition-all bg-white hover:bg-gray-200 text-black"
                  >
                    <span className="leading-none">{bet.type === "YES_NO" ? "No" : "Under"}</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5">
                      ${calculateEstimatedPayout("no").toFixed(2)}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-gray-500">{no}%</span>
                  </button>
                </div>
              ) : bet.type === "CLOSEST_GUESS" ? (
                <div className="flex items-center gap-1.5 sm:gap-2 mt-auto">
                  <input
                    type="text"
                    placeholder="Enter guess..."
                    id={`guess-${bet.id}`}
                    className="flex-1 bg-zinc-800 text-white text-[10px] sm:text-xs p-1.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 transition"
                  />
                  <button
                    onClick={() => {
                      const value = (
                        document.getElementById(`guess-${bet.id}`) as HTMLInputElement
                      )?.value;
                      if (!value || !value.trim()) return alert("Please enter a guess.");
                      
                      const numValue = parseFloat(value);
                      const finalValue = isNaN(numValue) ? value.trim() : numValue;
                      
                      onPick(bet, finalValue);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 rounded-lg shadow transition-all"
                  >
                    Submit
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </li>
  );
}
export default React.memo(ActiveBetCard);
