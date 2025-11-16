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
  const isH2H = bet.isH2H === true;
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  // Theme color based on bet type - PURPLE for H2H, ORANGE for Group
  const themeColor = isH2H ? "purple" : "orange";

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

  // Helper functions for names
  const getChallengerFirstLast = () => {
    if (bet.challengerName) {
      const parts = bet.challengerName.split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
    }
    return "Challenger";
  };

  const getChallengeeFirstLast = () => {
    if (bet.challengeeName) {
      const parts = bet.challengeeName.split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
    }
    return "Challengee";
  };

  // Check if bet is urgent (closing soon)
  const isUrgent = () => {
    if (!bet.closingAt) return false;
    const now = Date.now();
    const closingTime = new Date(bet.closingAt).getTime();
    const timeUntilClose = closingTime - now;
    const oneHour = 60 * 60 * 1000;
    return timeUntilClose > 0 && timeUntilClose < oneHour;
  };

  return (
    <li
      onClick={() => router.push(`/bets/${bet.id}`)}
      className={`
        rounded-xl px-2 py-2 sm:px-4 sm:py-3
        flex flex-col text-left shadow-md
        hover:scale-[1.01] sm:hover:scale-[1.02]
        transition-transform duration-200
        text-xs sm:text-sm
        w-full
        cursor-pointer
        ${isH2H
          ? 'bg-purple-950/30 border border-purple-500/50 hover:border-purple-400'
          : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
        }
        ${isUrgent()
          ? isH2H
            ? 'border-2 border-purple-500'
            : 'border-2 border-orange-500'
          : ''
        }
      `}
    >
      {/* H2H Pill Header - Top Left */}
      {isH2H ? (
        <div className="mb-3">
          {/* Header row with pill and delete button */}
          <div className="flex items-start justify-between mb-2">
            {/* User v User Pill - Like Group Name Badge */}
            <div className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500 rounded-full">
              <p className="text-xs font-semibold text-purple-500">
                {getChallengerFirstLast()} v. {getChallengeeFirstLast()}
              </p>
            </div>

            {/* Delete button for creator */}
            {isCreator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="p-1 hover:bg-zinc-800 rounded transition"
                aria-label="Delete bet"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 hover:text-red-600" />
              </button>
            )}
          </div>

          {/* Status and Odds Badges */}
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
                  {bet.h2hOdds.challenger}:{bet.h2hOdds.challengee}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regular Group Header - Orange Pill */
        <div className="mb-3">
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center px-3 py-1 bg-orange-500/20 border border-orange-500 rounded-full">
              <p className="text-xs font-semibold text-orange-500">
                {groupName || "Group"}
              </p>
            </div>

            {/* Delete button for creator */}
            {isCreator && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="p-1 hover:bg-zinc-800 rounded transition"
                aria-label="Delete bet"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 hover:text-red-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bet Title */}
      <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
        {bet.title}
      </h3>

      {/* DO NOT show participant count for H2H */}
      {!isH2H && bet.participants && bet.participants.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs text-zinc-500">
            {bet.participants.length} player{bet.participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Wager Display - PURPLE for H2H, ORANGE for Group */}
      {userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="mt-1">
          {/* Mobile: Compact info */}
          <p className="text-[9px] sm:hidden text-gray-400 mb-1">
            Pick: <span className={`font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
              {bet.picks[user.uid]}
            </span>
            {" • "}
            Payout: <span className="font-bold text-green-400">
              ${getEstimatedPayoutAfterPick().toFixed(2)}
            </span>
          </p>

          {/* Desktop: Full info */}
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400 mb-2">
              Your Pick:{" "}
              <span className={`font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
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

          {/* Progress Bar - PURPLE for H2H, ORANGE for Group */}
          <div className="bg-zinc-800 rounded-lg overflow-hidden h-5 flex items-center relative">
            <div
              className={`${isH2H ? 'bg-purple-500' : 'bg-orange-500'} h-full flex items-center justify-start px-2 transition-all duration-500 min-w-0`}
              style={{ width: `${yes}%` }}
            >
              {yes >= 10 && (
                <span className="text-white text-[10px] font-bold whitespace-nowrap">
                  {bet.type === "YES_NO" ? "Yes" : "Over"} {yes}%
                </span>
              )}
            </div>

            <div
              className="bg-white h-full flex items-center justify-end px-2 transition-all duration-500 min-w-0"
              style={{ width: `${no}%` }}
            >
              {no >= 10 && (
                <span className="text-black text-[10px] font-bold whitespace-nowrap">
                  {bet.type === "YES_NO" ? "No" : "Under"} {no}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* H2H Wager Display (if haven't picked yet) - PURPLE */}
      {isH2H && !userHasPicked && bet.betAmount && (
        <div className="text-xs text-purple-400 font-semibold mb-2">
          ${bet.betAmount} wager
        </div>
      )}

      {/* Closing Time - PURPLE for H2H, ZINC for Group */}
      {bet.status === "OPEN" && (
        <div className={`text-xs ${isH2H ? 'text-purple-400' : 'text-zinc-400'}`}>
          {getClosingTimeDisplay()}
        </div>
      )}

      {/* Status indicators */}
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

      {/* Judge Button */}
      {needsJudging && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJudge(bet);
          }}
          className="w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white mb-1.5 sm:mb-3 shadow-lg transition"
        >
          ⚖️ Judge This Bet
        </button>
      )}

      {/* Betting Interface */}
      {!isClosed && !userHasPicked && (
        <>
          {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
            <div className="mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile: Compact buttons */}
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(bet, bet.type === "YES_NO" ? "YES" : "OVER");
                  }}
                  className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center shadow transition-all ${isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
                >
                  <span className="leading-none">{bet.type === "YES_NO" ? "Yes" : "Over"}</span>
                  <span className="text-[9px] sm:text-[10px] text-white/80 mt-0.5">
                    ${calculateEstimatedPayout("yes").toFixed(2)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-white/60">{yes}%</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(bet, bet.type === "YES_NO" ? "NO" : "UNDER");
                  }}
                  className="flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center shadow transition-all bg-white hover:bg-gray-200 text-black"
                >
                  <span className="leading-none">{bet.type === "YES_NO" ? "No" : "Under"}</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5">
                    ${calculateEstimatedPayout("no").toFixed(2)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-gray-500">{no}%</span>
                </button>
              </div>
            </div>
          ) : bet.type === "CLOSEST_GUESS" ? (
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                placeholder="Enter guess..."
                id={`guess-${bet.id}`}
                className={`flex-1 bg-zinc-800 text-white text-[10px] sm:text-xs p-1.5 rounded-lg border border-zinc-700 focus:outline-none ${isH2H ? 'focus:border-purple-500' : 'focus:border-orange-500'} transition`}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const value = (
                    document.getElementById(`guess-${bet.id}`) as HTMLInputElement
                  )?.value;
                  if (!value || !value.trim()) return alert("Please enter a guess.");

                  const numValue = parseFloat(value);
                  const finalValue = isNaN(numValue) ? value.trim() : numValue;

                  onPick(bet, finalValue);
                }}
                className={`${isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white text-[10px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 rounded-lg shadow transition-all`}
              >
                Submit
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(false);
          }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg text-sm transition"
              >
                Cancel
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBet();
                }}
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
