"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase/client";
import { Trash2 } from "lucide-react";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isClosed } = getTimeRemaining(bet.closingAt);
  const wager = bet.perUserWager ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  // Helper function to format closing time
  const getClosingTimeDisplay = () => {
    if (!bet.closingAt) return "No close time";

    const now = Date.now();
    const closingTime = new Date(bet.closingAt).getTime();

    if (isNaN(closingTime)) return "No close time";
    if (closingTime <= now) return "CLOSED";

    const timeUntilClose = closingTime - now;
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // If closes in more than 7 days, show date format (MM/DD/YY)
    if (timeUntilClose > oneWeek) {
      const closingDate = new Date(bet.closingAt);
      const month = String(closingDate.getMonth() + 1).padStart(2, '0'); // Month first
      const day = String(closingDate.getDate()).padStart(2, '0');        // Day second
      const year = String(closingDate.getFullYear()).slice(-2);          // 2-digit year

      return `Closes ${month}/${day}/${year}`;
    }

    // If closes in 7 days or less, show countdown
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

  // Calculate winnings for display
  const calculateWinnings = () => {
    if (!userHasPicked || !user?.uid) return null;

    // Only show for binary and over/under bets
    if (bet.type !== "YES_NO" && bet.type !== "OVER_UNDER") return null;

    // Get user's pick
    const userPick = bet.picks?.[user.uid];
    if (!userPick) return null;

    // Wager is the per-user bet amount
    const userWager = wager;

    // Count how many people picked the same as user
    const yesVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "YES" || v === "OVER"
    ).length;
    const noVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "NO" || v === "UNDER"
    ).length;

    let winnersWithSamePick = 0;
    if (userPick === "YES" || userPick === "OVER") {
      winnersWithSamePick = yesVotes;
    } else if (userPick === "NO" || userPick === "UNDER") {
      winnersWithSamePick = noVotes;
    }

    // Calculate potential winnings (split pot among winners)
    const potentialWinners = Math.max(1, winnersWithSamePick);
    const potentialWin = Math.floor(pot / potentialWinners);

    return {
      wager: userWager,
      potentialWin: potentialWin,
      pick: userPick
    };
  };

  const winnings = calculateWinnings();

  const handleDeleteBet = async () => {
    if (isDeleting) return; // Prevent double-click

    try {
      setIsDeleting(true);

      // Delete from Firestore
      // Note: Frontend check only - for production, add Firebase security rules to verify creator
      await deleteDoc(doc(db, "bets", bet.id));

      setShowDeleteModal(false);
      // Real-time listener will automatically update UI

    } catch (error: any) {
      console.error("Error deleting bet:", error);
      alert(`Failed to delete bet: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
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
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-[9px] sm:text-xs font-bold text-orange-500">{getClosingTimeDisplay()}</span>
          {isCreator && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1 hover:bg-zinc-800 rounded transition"
              aria-label="Delete bet"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 hover:text-red-600" />
            </button>
          )}
        </div>
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

      {/* Over/Under Line Display */}
      {bet.type === "OVER_UNDER" && bet.line !== undefined && (
        <div className="mb-2 sm:mb-3">
          <p className="text-xs sm:text-sm font-bold text-orange-500">
            O/U Line: {bet.line}
          </p>
        </div>
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
                  {/* Wager → Winnings Display */}
                  {winnings && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-orange-400">
                        ${winnings.wager.toFixed(2)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-zinc-500">→</span>
                      <span className="text-[10px] sm:text-xs font-semibold text-green-500">
                        ${winnings.potentialWin.toFixed(2)}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-zinc-500">
                        ({winnings.pick})
                      </span>
                    </div>
                  )}

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Bet?
            </h3>

            <p className="text-sm text-zinc-400 mb-4">
              This will permanently delete "{bet.title}" and void all picks. This action cannot be undone.
            </p>

            {people > 0 && (
              <p className="text-sm text-orange-500 mb-4">
                ⚠️ {people} {people === 1 ? 'person has' : 'people have'} already placed bets.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg text-sm transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteBet}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg text-sm transition"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
export default React.memo(ActiveBetCard);
