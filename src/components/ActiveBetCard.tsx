"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, arrayUnion, collection, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Users, Check, X, TrendingUp } from "lucide-react";

interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPickMade?: () => void;
}

export default function ActiveBetCard({ bet, user, onPickMade }: ActiveBetCardProps) {
  const router = useRouter();
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPick, setSelectedPick] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isH2H = bet.isH2H === true;

  // Check if user has made a pick
  const userHasPicked = bet.picks && bet.picks[user?.uid];
  const userPick = bet.picks?.[user?.uid];

  // Calculate time until close
  const now = Date.now();
  const closingTime = new Date(bet.closingAt).getTime();
  const timeUntilClose = closingTime - now;
  const isUrgent = timeUntilClose > 0 && timeUntilClose <= 60 * 60 * 1000; // 1 hour

  // Check if bet is still open for picks
  const canPick = bet.status === "OPEN" && timeUntilClose > 0 && !userHasPicked;

  // Calculate percentages for YES/NO or OVER/UNDER
  const calculatePercentages = () => {
    if (!bet.picks || Object.keys(bet.picks).length === 0) {
      return { yes: 50, no: 50 };
    }

    const picks = Object.values(bet.picks);
    const total = picks.length;

    if (bet.type === "binary" || bet.type === "YES_NO") {
      const yesCount = picks.filter(p => p === "YES").length;
      const noCount = picks.filter(p => p === "NO").length;
      return {
        yes: total > 0 ? Math.round((yesCount / total) * 100) : 50,
        no: total > 0 ? Math.round((noCount / total) * 100) : 50
      };
    } else if (bet.type === "over_under" || bet.type === "OVER_UNDER") {
      const overCount = picks.filter(p => p === "OVER").length;
      const underCount = picks.filter(p => p === "UNDER").length;
      return {
        yes: total > 0 ? Math.round((overCount / total) * 100) : 50,
        no: total > 0 ? Math.round((underCount / total) * 100) : 50
      };
    }

    return { yes: 50, no: 50 };
  };

  const { yes, no } = calculatePercentages();

  // Calculate estimated payout
  const getEstimatedPayout = () => {
    if (!userHasPicked || !bet.picks) return 0;

    const totalParticipants = bet.participants?.length || 0;
    const minBet = bet.settings?.min_bet || 10;
    const totalPot = totalParticipants * minBet;

    // Count how many picked the same as user
    const usersPick = bet.picks[user.uid];
    const samePickCount = Object.values(bet.picks).filter(p => p === usersPick).length;

    if (samePickCount === 0) return 0;

    // Winner take all: pot divided among winners
    if (bet.settings?.payout_structure === "winner_take_all" || !bet.settings?.payout_structure) {
      return totalPot / samePickCount;
    }

    // Proportional: based on odds
    const winningOdds = samePickCount / totalParticipants;
    return minBet / winningOdds;
  };

  const estimatedPayout = getEstimatedPayout();

  // Format closing time display
  const getClosingTimeDisplay = () => {
    if (timeUntilClose <= 0) {
      return "Closed";
    }

    const hours = Math.floor(timeUntilClose / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) {
      return `Closes in ${days} days`;
    } else if (hours > 1) {
      return `Closes in ${hours} hours`;
    } else {
      const minutes = Math.floor(timeUntilClose / (1000 * 60));
      return `Closes in ${minutes} minutes`;
    }
  };

  // Submit pick to Firestore
  const submitPick = async () => {
    if (!selectedPick) {
      alert("Please select an option");
      return;
    }

    if (!user) {
      alert("Please log in to place a bet");
      return;
    }

    setIsSubmitting(true);

    try {
      const betRef = doc(db, "bets", bet.id);

      // Update bet with user's pick
      await updateDoc(betRef, {
        [`picks.${user.uid}`]: selectedPick,
        participants: arrayUnion(user.uid)
      });

      console.log("Pick submitted successfully:", {
        betId: bet.id,
        userId: user.uid,
        pick: selectedPick
      });

      // Close modal
      setShowPickModal(false);
      setSelectedPick("");

      // Refresh the bet list
      if (onPickMade) {
        onPickMade();
      }

    } catch (error: any) {
      console.error("Error submitting pick:", error);
      alert(`Failed to submit pick: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get button text based on bet type
  const getPickButtonText = () => {
    if (bet.type === "binary" || bet.type === "YES_NO") {
      return "Place Your Bet";
    } else if (bet.type === "over_under" || bet.type === "OVER_UNDER") {
      return "Pick Over/Under";
    } else if (bet.type === "multiple_choice" || bet.type === "MULTIPLE_CHOICE") {
      return "Make Your Pick";
    } else {
      return "Join Bet";
    }
  };

  // Get modal title
  const getModalTitle = () => {
    if (bet.type === "over_under" || bet.type === "OVER_UNDER") {
      return `Over/Under ${bet.line || ""}`;
    }
    return "Make Your Pick";
  };

  // Helper functions for H2H
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

  // Check if this is a pending challenge for this user
  const isPendingChallenge =
    isH2H &&
    bet.h2hStatus === "pending" &&
    bet.challengeeId === user?.uid;

  // Accept H2H challenge (separate from group bet picking)
  const acceptChallenge = async (pick: string) => {
    if (!pick) {
      alert("Please select your pick");
      return;
    }

    setIsProcessing(true);

    try {
      const betRef = doc(db, "bets", bet.id);

      await updateDoc(betRef, {
        [`picks.${user.uid}`]: pick,
        participants: arrayUnion(user.uid),
        h2hStatus: "accepted",
        h2hAcceptedAt: new Date().toISOString()
      });

      // Notify challenger
      await addDoc(collection(db, "notifications"), {
        userId: bet.challengerId,
        type: "h2h_challenge",
        title: "Challenge Accepted!",
        message: `${user.displayName || `${user.firstName} ${user.lastName}`} accepted your challenge: "${bet.title}"`,
        link: `/bets/${bet.id}`,
        betId: bet.id,
        betTitle: bet.title,
        read: false,
        createdAt: new Date().toISOString()
      });

      console.log("Challenge accepted, notifications sent");

      setShowPickModal(false);
      if (onPickMade) onPickMade();

    } catch (error: any) {
      console.error("Error accepting challenge:", error);
      alert(`Failed to accept: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject H2H challenge
  const rejectChallenge = async () => {
    setIsProcessing(true);

    try {
      await deleteDoc(doc(db, "bets", bet.id));

      // Notify challenger
      await addDoc(collection(db, "notifications"), {
        userId: bet.challengerId,
        type: "h2h_challenge",
        title: "Challenge Declined",
        message: `${user.displayName || `${user.firstName} ${user.lastName}`} declined your challenge: "${bet.title}"`,
        read: false,
        createdAt: new Date().toISOString()
      });

      console.log("Challenge rejected, notifications sent");

      setShowRejectModal(false);
      if (onPickMade) onPickMade();

    } catch (error: any) {
      console.error("Error rejecting challenge:", error);
      alert(`Failed to decline: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== H2H BET CARD ====================
  if (isH2H) {
    return (
      <>
        <div
          className={`
            rounded-2xl p-4 transition-all
            bg-purple-950/30 border border-purple-500/50
            ${isPendingChallenge ? 'border-2 border-purple-500 animate-pulse' : 'hover:border-purple-400'}
          `}
        >
          {/* PENDING CHALLENGE BANNER */}
          {isPendingChallenge && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-red-500">
                  🎯 YOU'VE BEEN CHALLENGED!
                </p>
              </div>

              <p className="text-xs text-white mb-3">
                <span className="font-semibold">{bet.challengerName}</span> wants to bet with you
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-zinc-400">Wager:</span>
                  <span className="text-white font-semibold ml-1">
                    ${bet.betAmount * bet.h2hOdds?.challengee || bet.betAmount}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Win:</span>
                  <span className="text-green-500 font-semibold ml-1">
                    ${bet.betAmount * bet.h2hOdds?.challenger || bet.betAmount}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPickModal(true);
                  }}
                  className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRejectModal(true);
                  }}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Rest of H2H card */}
          <div onClick={() => router.push(`/bets/${bet.id}`)} className="cursor-pointer">
            <div className="mb-3">
              <div className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500 rounded-full">
                <p className="text-xs font-semibold text-purple-500">
                  {getChallengerFirstLast()} v. {getChallengeeFirstLast()}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-2">
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

                {bet.h2hOdds && (
                  <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-2 py-0.5">
                    <span className="text-[10px] text-purple-400 font-medium">
                      {bet.h2hOdds.challenger}:{bet.h2hOdds.challengee}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
              {bet.title}
            </h3>

            {bet.betAmount && (
              <div className="text-xs text-purple-400 font-semibold mb-2">
                ${bet.betAmount} wager
              </div>
            )}

            {bet.status === "OPEN" && (
              <div className="text-xs text-purple-400">
                {getClosingTimeDisplay()}
              </div>
            )}
          </div>
        </div>

        {/* H2H Pick Modal */}
        {showPickModal && isPendingChallenge && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowPickModal(false)}
          >
            <div
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Accept Challenge - Make Your Pick
              </h3>

              <div className="space-y-2 mb-6">
                {bet.options?.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => setSelectedPick(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      selectedPick === option
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      selectedPick === option ? 'text-purple-500' : 'text-white'
                    }`}>
                      {option}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => acceptChallenge(selectedPick)}
                disabled={!selectedPick || isProcessing}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors"
              >
                {isProcessing ? "Accepting..." : "Accept Challenge"}
              </button>
            </div>
          </div>
        )}

        {/* H2H Reject Modal */}
        {showRejectModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <div
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-3">
                Decline Challenge?
              </h3>

              <p className="text-zinc-400 text-sm mb-6">
                This will delete the bet and notify{" "}
                <span className="text-white font-semibold">{bet.challengerName}</span>.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={rejectChallenge}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-zinc-800 text-white rounded-lg font-semibold transition-colors"
                >
                  {isProcessing ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==================== GROUP BET CARD ====================
  return (
    <>
      <div
        className={`
          bg-zinc-900 rounded-2xl p-4 transition-all
          ${isUrgent
            ? 'border-2 border-orange-500 shadow-orange-500/20 shadow-lg'
            : 'border border-zinc-800 hover:border-zinc-700'
          }
        `}
      >
        {/* Clickable area for viewing bet details */}
        <div
          onClick={() => router.push(`/bets/${bet.id}`)}
          className="cursor-pointer"
        >
          {/* Group Name Pill */}
          <div className="mb-3">
            <div className="inline-flex items-center px-3 py-1 bg-orange-500/20 border border-orange-500 rounded-full">
              <p className="text-xs font-semibold text-orange-500">
                {bet.groupName || "Group"}
              </p>
            </div>
          </div>

          {/* Bet Title */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
            {bet.title}
          </h3>

          {/* Creator Name */}
          {bet.creatorName && (
            <p className="text-xs text-zinc-500 mb-3">
              by {bet.creatorName}
            </p>
          )}

          {/* Stats Row: Wager • Players • Pot */}
          <div className="flex items-center gap-3 mb-3 text-xs">
            {bet.settings?.min_bet && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400">Wager:</span>
                  <span className="text-white font-semibold">${bet.settings.min_bet}</span>
                </div>
                <span className="text-zinc-700">•</span>
              </>
            )}

            {bet.participants && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400">Players:</span>
                  <span className="text-white font-semibold">{bet.participants.length}</span>
                </div>
                <span className="text-zinc-700">•</span>
              </>
            )}

            {bet.participants && bet.settings?.min_bet && (
              <div className="flex items-center gap-1">
                <span className="text-zinc-400">Pot:</span>
                <span className="text-orange-500 font-semibold">
                  ${bet.participants.length * bet.settings.min_bet}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ALREADY PICKED - Show pick and progress bar */}
        {userHasPicked && (bet.type === "binary" || bet.type === "YES_NO" || bet.type === "over_under" || bet.type === "OVER_UNDER") && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            {/* Mobile: Compact info */}
            <p className="text-[9px] sm:hidden text-gray-400 mb-2">
              Pick: <span className="font-bold text-orange-400">{userPick}</span>
              {" • "}
              Payout: <span className="font-bold text-green-400">${estimatedPayout.toFixed(2)}</span>
            </p>

            {/* Desktop: Full info */}
            <div className="hidden sm:block mb-2">
              <p className="text-xs text-gray-400">
                Your Pick:{" "}
                <span className="font-bold text-orange-400">{userPick}</span>
              </p>
              <p className="text-xs text-gray-400">
                Estimated Payout:{" "}
                <span className="font-bold text-green-400">
                  ${estimatedPayout.toFixed(2)}
                </span>
                {" "}if {userPick} wins
              </p>
            </div>

            {/* Progress Bar */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden h-5 flex items-center relative">
              <div
                className="bg-orange-500 h-full flex items-center justify-start px-2 transition-all duration-500 min-w-0"
                style={{ width: `${yes}%` }}
              >
                {yes >= 10 && (
                  <span className="text-white text-[10px] font-bold whitespace-nowrap">
                    {bet.type === "over_under" || bet.type === "OVER_UNDER" ? "Over" : "Yes"} {yes}%
                  </span>
                )}
              </div>

              <div
                className="bg-white h-full flex items-center justify-end px-2 transition-all duration-500 min-w-0"
                style={{ width: `${no}%` }}
              >
                {no >= 10 && (
                  <span className="text-black text-[10px] font-bold whitespace-nowrap">
                    {bet.type === "over_under" || bet.type === "OVER_UNDER" ? "Under" : "No"} {no}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ALREADY PICKED - Multiple Choice */}
        {userHasPicked && (bet.type === "multiple_choice" || bet.type === "MULTIPLE_CHOICE") && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-xs text-gray-400 mb-2">
              Your Pick:{" "}
              <span className="font-bold text-orange-400">{userPick}</span>
            </p>
            <p className="text-xs text-gray-400">
              Estimated Payout:{" "}
              <span className="font-bold text-green-400">
                ${estimatedPayout.toFixed(2)}
              </span>
            </p>
          </div>
        )}

        {/* NOT PICKED YET - Show "Place Your Bet" Button */}
        {canPick && (
          <div
            className="mt-3 pt-3 border-t border-zinc-800"
            onClick={(e) => e.stopPropagation()} // Prevent card click
          >
            <button
              onClick={() => setShowPickModal(true)}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {getPickButtonText()}
            </button>
          </div>
        )}

        {/* Closing Time */}
        <div
          onClick={() => router.push(`/bets/${bet.id}`)}
          className="cursor-pointer mt-3"
        >
          {bet.status === "OPEN" && (
            <div className={`text-xs ${isUrgent ? 'text-orange-500 font-semibold' : 'text-zinc-400'}`}>
              {getClosingTimeDisplay()}
            </div>
          )}

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
      </div>

      {/* GROUP BET PICK MODAL */}
      {showPickModal && !isH2H && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowPickModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowPickModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <h3 className="text-lg font-semibold text-white mb-2">
              {getModalTitle()}
            </h3>

            <p className="text-sm text-zinc-400 mb-4">
              {bet.title}
            </p>

            {/* Bet Description (if exists) */}
            {bet.description && (
              <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-800 rounded-lg">
                {bet.description}
              </p>
            )}

            {/* Wager Info */}
            {bet.settings?.min_bet && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-orange-400">
                  Wager: <span className="font-bold">${bet.settings.min_bet}</span>
                  {estimatedPayout > 0 && (
                    <span className="text-zinc-400"> • Potential Win: </span>
                  )}
                  {estimatedPayout > 0 && (
                    <span className="font-bold text-green-400">${estimatedPayout.toFixed(2)}</span>
                  )}
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2 mb-6">
              {bet.options?.map((option: string) => (
                <button
                  key={option}
                  onClick={() => setSelectedPick(option)}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPick === option
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <span className={`font-semibold ${
                    selectedPick === option ? 'text-orange-500' : 'text-white'
                  }`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>

            {/* Confirm Button */}
            <button
              onClick={submitPick}
              disabled={!selectedPick || isSubmitting}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Confirm Pick"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
