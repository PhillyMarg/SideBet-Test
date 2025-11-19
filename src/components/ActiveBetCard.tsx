"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, updateDoc, addDoc, collection, arrayUnion, serverTimestamp } from "firebase/firestore";
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
  onPickMade?: () => void;
}

function ActiveBetCard({
  bet,
  user,
  onPick,
  onJudge,
  groupName,
  onPickMade,
}: ActiveBetCardProps) {
  // ============ DEBUG LOGGING ============
  console.log("=== BET CARD DEBUG ===");
  console.log("Bet ID:", bet.id);
  console.log("Bet Type:", bet.type);
  console.log("Bet Status:", bet.status);
  console.log("Bet Options:", bet.options);
  console.log("User ID:", user?.uid);
  console.log("Participants:", bet.participants);
  console.log("Picks:", bet.picks);
  console.log("Is H2H:", bet.isH2H);
  console.log("H2H Status:", bet.h2hStatus);
  console.log("Closing At:", bet.closingAt);

  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [loadingCreator, setLoadingCreator] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // H2H Accept/Reject state
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPick, setSelectedPick] = useState("");
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  // Change Vote state
  const [showChangeVoteModal, setShowChangeVoteModal] = useState(false);
  const [newVoteChoice, setNewVoteChoice] = useState("");

  const { isClosed } = getTimeRemaining(bet.closingAt);
  const isH2H = bet.isH2H === true;
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  console.log("User Has Picked:", userHasPicked);
  console.log("Is Closed:", isClosed);
  console.log("Should Show Voting Section:", !isClosed && (!isH2H || bet.h2hStatus === "accepted"));
  console.log("Should Show Vote Buttons:", !isClosed && (!isH2H || bet.h2hStatus === "accepted") && !userHasPicked);
  console.log("======================")

  // Debug logging for voting conditions
  useEffect(() => {
    console.log("Bet voting conditions:", {
      betId: bet.id,
      betTitle: bet.title,
      type: bet.type,
      status: bet.status,
      isClosed,
      isH2H,
      h2hStatus: bet.h2hStatus,
      userHasPicked,
      canVote: !isClosed && (!isH2H || bet.h2hStatus === "accepted") && !userHasPicked
    });
  }, [bet.id, bet.title, bet.type, bet.status, isClosed, isH2H, bet.h2hStatus, userHasPicked]);

  // Debug logging for H2H bet names
  useEffect(() => {
    if (isH2H) {
      console.log("=== H2H NAME DEBUG ===");
      console.log("Challenger Name from bet:", bet.challengerName);
      console.log("Challengee Name from bet:", bet.challengeeName);
      console.log("Current user:", user);
      console.log("User first/last:", user?.firstName, user?.lastName);
      console.log("Is user challenger?", user?.uid === bet.challengerId);
      console.log("Is user challengee?", user?.uid === bet.challengeeId);
      console.log("Bet data:", bet);
      console.log("Challenger ID:", bet.challengerId);
      console.log("Challengee ID:", bet.challengeeId);
      console.log("Creator ID:", bet.creatorId);
      console.log("User ID:", user?.uid);
    }
  }, [isH2H, bet, user?.uid]);

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

  // H2H Accept Challenge Handlers
  const handleAcceptChallenge = () => {
    // Open modal to pick a side
    setShowPickModal(true);
  };

  const submitH2HAccept = async () => {
    if (!user?.uid || !selectedPick) return;

    try {
      const betRef = doc(db, "bets", bet.id);

      // Update bet status and add challengee's pick
      await updateDoc(betRef, {
        h2hStatus: "active",
        status: "OPEN",
        participants: arrayUnion(user.uid),
        [`picks.${user.uid}`]: selectedPick
      });

      // Send notification to challenger
      await addDoc(collection(db, "notifications"), {
        recipientId: bet.challengerId,
        type: "H2H_ACCEPTED",
        title: "Challenge Accepted!",
        message: `${user.firstName} ${user.lastName} accepted your H2H challenge`,
        read: false,
        createdAt: serverTimestamp(),
        betId: bet.id,
        senderId: user.uid,
        senderName: `${user.firstName} ${user.lastName}`
      });

      console.log("H2H challenge accepted");
      setShowPickModal(false);
      setSelectedPick("");
      if (onPickMade) onPickMade();

    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert("Failed to accept challenge");
    }
  };

  // H2H Decline Challenge Handlers
  const handleDeclineChallenge = () => {
    setShowDeclineConfirm(true);
  };

  const confirmDecline = async () => {
    try {
      const betRef = doc(db, "bets", bet.id);

      // Update bet status to declined
      await updateDoc(betRef, {
        h2hStatus: "declined",
        status: "CLOSED"
      });

      // Send notification to challenger
      await addDoc(collection(db, "notifications"), {
        recipientId: bet.challengerId,
        type: "H2H_DECLINED",
        title: "Challenge Declined",
        message: `${user.firstName} ${user.lastName} declined your H2H challenge`,
        read: false,
        createdAt: serverTimestamp(),
        betId: bet.id,
        senderId: user.uid,
        senderName: `${user.firstName} ${user.lastName}`
      });

      console.log("H2H challenge declined");
      setShowDeclineConfirm(false);
      if (onPickMade) onPickMade();

    } catch (error) {
      console.error("Error declining challenge:", error);
      alert("Failed to decline challenge");
    }
  };

  // Change Vote Handler
  const handleChangeVote = async () => {
    if (!newVoteChoice || !user?.uid) return;

    try {
      const betRef = doc(db, "bets", bet.id);

      // Update user's vote
      await updateDoc(betRef, {
        [`picks.${user.uid}`]: newVoteChoice,
        updatedAt: serverTimestamp()
      });

      console.log("Vote changed successfully");
      setShowChangeVoteModal(false);
      setNewVoteChoice("");
      if (onPickMade) onPickMade();

    } catch (error) {
      console.error("Error changing vote:", error);
      alert("Failed to change vote");
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
            ? isH2H
              ? "bg-purple-500/10 border-2 border-purple-500/50 hover:border-purple-500"
              : "bg-orange-500/10 border-2 border-orange-500/50 hover:border-orange-500"
            : isH2H
              ? "bg-zinc-900 border border-zinc-800 hover:border-purple-500"
              : "bg-zinc-900 border border-zinc-800 hover:border-orange-500"
        }
      `}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* H2H Header - Show Full Names */}
          {isH2H ? (
            <div className="flex flex-col gap-1">
              {/* H2H vs Display with FULL NAMES - NO LABELS */}
              <p className="text-[9px] sm:text-xs font-bold text-purple-500">
                {bet.challengerName || 'Challenger'} v {bet.challengeeName || 'Challengee'}
              </p>

              {/* H2H Status Badges */}
              <div className="flex items-center gap-1 flex-wrap">
                {bet.h2hStatus === "pending" && bet.challengeeId === user?.uid && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded-full px-1.5 py-0.5 animate-pulse">
                    <span className="text-[8px] sm:text-[9px] text-red-500 font-bold">RESPOND NOW</span>
                  </div>
                )}

                {bet.h2hStatus === "pending" && bet.challengerId === user?.uid && (
                  <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-1.5 py-0.5">
                    <span className="text-[8px] sm:text-[9px] text-purple-400 font-medium">AWAITING RESPONSE</span>
                  </div>
                )}

                {bet.h2hStatus === "accepted" && (
                  <div className="bg-green-500/20 border border-green-500/40 rounded-full px-1.5 py-0.5">
                    <span className="text-[8px] sm:text-[9px] text-green-500 font-medium">ACTIVE</span>
                  </div>
                )}

                {/* Odds Badge - PURPLE */}
                {bet.h2hOdds && (
                  <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-1.5 py-0.5">
                    <span className="text-[8px] sm:text-[9px] text-purple-400 font-medium">
                      {bet.h2hOdds.challenger}:{bet.h2hOdds.challengee}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Regular Group Header - ORANGE */
            <>
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
            </>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`text-[9px] sm:text-xs font-bold ${isH2H ? 'text-purple-500' : 'text-orange-500'}`}>
            {getClosingTimeDisplay()}
          </span>
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
          <p className={`text-xs sm:text-sm font-bold ${isH2H ? 'text-purple-500' : 'text-orange-500'}`}>
            O/U Line: {bet.line}
          </p>
        </div>
      )}

      {/* Stats Row - Compact on mobile */}
      <div className="flex justify-between text-[10px] sm:text-sm text-gray-400 mb-1.5 sm:mb-4">
        <span className="sm:inline">Wager: ${wager.toFixed(2)}</span>
        <span className="hidden sm:inline">Players: {people}</span>
        <span className={`font-semibold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
          Pot: ${pot.toFixed(2)}
        </span>
      </div>

      {/* ACCEPT/REJECT BUTTONS - Only show for challengee when pending */}
      {bet.isH2H && bet.h2hStatus === "pending" && user?.uid === bet.challengeeId && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptChallenge();
            }}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors text-xs sm:text-sm"
          >
            Accept Challenge
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeclineChallenge();
            }}
            className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors text-xs sm:text-sm"
          >
            Decline
          </button>
        </div>
      )}

      {/* Judge Button */}
      {needsJudging && (
        <button
          onClick={() => onJudge(bet)}
          className="w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white mb-1.5 sm:mb-3 shadow-lg transition"
        >
          ⚖️ Judge This Bet
        </button>
      )}

      {/* H2H Result Display - Winner/Loser */}
      {isH2H && bet.status === "JUDGED" && bet.winnerId && (
        <div className={`rounded-xl p-4 mb-3 border-2 ${
          bet.winnerId === user?.uid
            ? 'bg-emerald-900/40 border-green-500'
            : 'bg-red-900/30 border-red-500'
        }`}>
          {/* Winner/Loser Banner */}
          {bet.winnerId === user?.uid ? (
            <>
              <div className="text-center mb-3">
                <p className="text-lg sm:text-xl font-bold text-white mb-1">
                  🏆 YOU WON! 🏆
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-500">
                  +${bet.winnerPayout?.toFixed(2) || '0.00'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-3">
                <p className="text-sm sm:text-base text-red-300 mb-1">
                  Better luck next time
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-red-500">
                  -${(bet.betAmount || 0).toFixed(2)}
                </p>
              </div>
            </>
          )}

          {/* Final Result Section */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs sm:text-sm text-gray-300 font-semibold mb-2">
              Final Result: <span className="text-purple-400">
                {bet.winningChoice || bet.actualValue}
              </span>
            </p>

            {/* Both Picks with Checkmark */}
            <div className="space-y-1.5">
              <div className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                bet.winnerId === user?.uid ? 'bg-green-900/30' : 'bg-zinc-800/50'
              }`}>
                <span className="text-xs sm:text-sm text-gray-300">
                  You Picked: <span className="font-bold text-white">
                    {bet.picks?.[user?.uid]}
                  </span>
                </span>
                {bet.winnerId === user?.uid && (
                  <span className="text-green-500 text-base sm:text-lg font-bold">✓</span>
                )}
              </div>

              <div className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                bet.winnerId !== user?.uid ? 'bg-green-900/30' : 'bg-zinc-800/50'
              }`}>
                <span className="text-xs sm:text-sm text-gray-300">
                  They Picked: <span className="font-bold text-white">
                    {bet.picks?.[bet.winnerId === bet.challengerId ? bet.challengeeId : bet.challengerId]}
                  </span>
                </span>
                {bet.winnerId !== user?.uid && (
                  <span className="text-green-500 text-base sm:text-lg font-bold">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Betting Interface */}
      {!isClosed && (!isH2H || bet.h2hStatus === "accepted") && (
        <>
          {userHasPicked ? (
            <>
              {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
                <div className="mt-1 space-y-2">
                  {/* You Voted Indicator with Checkmark */}
                  <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-semibold text-white">
                        You Voted: <span className={`${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                          {bet.picks[user?.uid]}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Current Results Label */}
                  <p className="text-xs text-gray-400 font-medium">Current Results:</p>

                  {/* Progress Bar - ORANGE for YES side */}
                  <div className="bg-zinc-800 rounded-lg overflow-hidden h-6 flex items-center relative">
                    {/* YES/OVER Side */}
                    <div
                      className="bg-[#FF6B35] h-full flex items-center justify-start px-2 transition-all duration-500 min-w-0"
                      style={{ width: `${yes}%` }}
                    >
                      {yes >= 10 && (
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          {bet.type === "YES_NO" ? "YES" : "OVER"} {yes}%
                        </span>
                      )}
                    </div>

                    {/* NO/UNDER Side */}
                    <div
                      className="bg-zinc-700 h-full flex items-center justify-end px-2 transition-all duration-500 min-w-0"
                      style={{ width: `${no}%` }}
                    >
                      {no >= 10 && (
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          {bet.type === "YES_NO" ? "NO" : "UNDER"} {no}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Change Vote Button */}
                  <button
                    onClick={() => setShowChangeVoteModal(true)}
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    Change Vote
                  </button>
                </div>
              ) : bet.type === "CLOSEST_GUESS" ? (
                <div className="mt-1 flex flex-col items-center">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 mb-1 sm:mb-1.5">
                    Your Guess:{" "}
                    <span className={`font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
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
                    className={`${isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white text-[10px] sm:text-[11px] font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition`}
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
                                      ? `${isH2H ? 'text-purple-400' : 'text-orange-400'} font-semibold`
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
                    className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center shadow transition-all ${isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
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
                    className={`flex-1 bg-zinc-800 text-white text-[10px] sm:text-xs p-1.5 rounded-lg border border-zinc-700 focus:outline-none ${isH2H ? 'focus:border-purple-500' : 'focus:border-orange-500'} transition`}
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
                    className={`${isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white text-[10px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 rounded-lg shadow transition-all`}
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

      {/* Pick Modal for H2H Accept */}
      {showPickModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPickModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-purple-500 p-6 max-w-md w-full relative z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Accept Challenge - Choose Your Side
            </h3>

            <p className="text-zinc-400 text-sm mb-4">
              {bet.title}
            </p>

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

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPickModal(false);
                  setSelectedPick("");
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={submitH2HAccept}
                disabled={!selectedPick}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg font-semibold transition-colors"
              >
                Accept Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowDeclineConfirm(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Decline Challenge?
            </h3>

            <p className="text-zinc-400 text-sm mb-6">
              Are you sure you want to decline this H2H challenge from {bet.challengerName}?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeclineConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={confirmDecline}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
              >
                Decline Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Vote Modal */}
      {showChangeVoteModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowChangeVoteModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Change Your Vote
            </h3>

            <p className="text-zinc-400 text-sm mb-4">
              {bet.title}
            </p>

            <p className="text-sm text-zinc-400 mb-4">
              Current vote: <span className={`font-semibold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                {bet.picks[user?.uid]}
              </span>
            </p>

            <div className="space-y-2 mb-6">
              {bet.type === "YES_NO" ? (
                <>
                  <button
                    onClick={() => setNewVoteChoice("YES")}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      newVoteChoice === "YES"
                        ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      newVoteChoice === "YES"
                        ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                        : 'text-white'
                    }`}>
                      YES
                    </span>
                  </button>
                  <button
                    onClick={() => setNewVoteChoice("NO")}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      newVoteChoice === "NO"
                        ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      newVoteChoice === "NO"
                        ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                        : 'text-white'
                    }`}>
                      NO
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setNewVoteChoice("OVER")}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      newVoteChoice === "OVER"
                        ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      newVoteChoice === "OVER"
                        ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                        : 'text-white'
                    }`}>
                      OVER
                    </span>
                  </button>
                  <button
                    onClick={() => setNewVoteChoice("UNDER")}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      newVoteChoice === "UNDER"
                        ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      newVoteChoice === "UNDER"
                        ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                        : 'text-white'
                    }`}>
                      UNDER
                    </span>
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowChangeVoteModal(false);
                  setNewVoteChoice("");
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleChangeVote}
                disabled={!newVoteChoice}
                className={`flex-1 py-3 ${
                  isH2H
                    ? 'bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800'
                    : 'bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800'
                } disabled:text-zinc-500 text-white rounded-lg font-semibold transition-colors`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
export default React.memo<ActiveBetCardProps>(ActiveBetCard);
