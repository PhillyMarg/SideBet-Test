"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, updateDoc, addDoc, collection, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase/client";
import { validateBetDeletion } from "../lib/validation/betValidation";
import { Trash2, Link, ChevronDown } from "lucide-react";
import { getTimeRemaining, getLivePercentages } from "../utils/timeUtils";
import { fetchUserData, getUserDisplayName } from "../utils/userUtils";
import { generateBetShareLink, copyToClipboard } from "../utils/shareUtils";

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

  // Share state
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const { isClosed } = getTimeRemaining(bet.closingAt);
  const isH2H = bet.isH2H === true;
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  // Determine if user can vote based on H2H status and role
  const isChallenger = isH2H && bet.challengerId === user?.uid;
  const isChallengee = isH2H && bet.challengeeId === user?.uid;
  const isPending = bet.h2hStatus === "pending";

  // Voting is allowed when:
  // - For non-H2H: always (if not closed)
  // - For H2H accepted: both can vote
  // - For H2H pending: only challenger can vote
  const canVote = !isClosed && (
    !isH2H ||
    bet.h2hStatus === "accepted" ||
    (isPending && isChallenger)
  );

  console.log("User Has Picked:", userHasPicked);
  console.log("Is Closed:", isClosed);
  console.log("Is Challenger:", isChallenger);
  console.log("Is Challengee:", isChallengee);
  console.log("Can Vote:", canVote);
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
      isChallenger,
      isChallengee,
      canVote
    });
  }, [bet.id, bet.title, bet.type, bet.status, isClosed, isH2H, bet.h2hStatus, userHasPicked, isChallenger, isChallengee, canVote]);

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

  // Helper function to check if bet is closing within 1 hour
  const isClosingSoon = useMemo(() => {
    const closingTime = new Date(bet.closingAt).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return (closingTime - now) <= oneHour && (closingTime - now) > 0;
  }, [bet.closingAt]);

  // Helper function to format closing date as MM/DD/YYYY
  const formatClosingDate = (isoString: string) => {
    if (!isoString) return 'TBD';
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
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

    // Security check: Verify user is the creator
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to delete a bet');
      return;
    }

    const validation = validateBetDeletion(
      bet.creatorId,
      currentUser.uid,
      bet.participants?.length || 0
    );

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Confirm if participants exist
    if (bet.participants?.length > 0) {
      const confirmed = window.confirm(
        `${bet.participants.length} people have placed bets. Their wagers will be voided. Delete anyway?`
      );
      if (!confirmed) {
        setShowDeleteModal(false);
        return;
      }
    }

    try {
      setIsDeleting(true);

      // Delete from Firestore
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
  const handleAcceptChallenge = async () => {
    if (!user?.uid) return;

    try {
      const challengerPick = bet.picks?.[bet.challengerId];

      // For CLOSEST_GUESS, open modal to get challengee's guess
      if (bet.type === "CLOSEST_GUESS") {
        setShowPickModal(true);
        return;
      }

      // For YES_NO and OVER_UNDER, auto-assign opposite pick
      let challengeePick: string;

      if (bet.type === "YES_NO") {
        if (!challengerPick) {
          alert("Challenger hasn't made their pick yet. Please wait.");
          return;
        }
        // Challengee gets opposite of challenger
        challengeePick = challengerPick === "YES" ? "NO" : "YES";
      } else if (bet.type === "OVER_UNDER") {
        if (!challengerPick) {
          alert("Challenger hasn't made their pick yet. Please wait.");
          return;
        }
        // Challengee gets opposite of challenger
        challengeePick = challengerPick === "OVER" ? "UNDER" : "OVER";
      } else {
        alert("Invalid bet type");
        return;
      }

      // Update bet to accepted with challengee's pick
      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        h2hStatus: "accepted",
        status: "OPEN",
        participants: arrayUnion(user.uid),
        [`picks.${user.uid}`]: challengeePick
      });

      // Send notification to challenger
      await addDoc(collection(db, "notifications"), {
        recipientId: bet.challengerId,
        type: "H2H_ACCEPTED",
        title: "Challenge Accepted!",
        message: `${user.firstName} ${user.lastName} accepted your H2H challenge - They picked ${challengeePick}`,
        read: false,
        createdAt: serverTimestamp(),
        betId: bet.id,
        senderId: user.uid,
        senderName: `${user.firstName} ${user.lastName}`
      });

      console.log("H2H challenge accepted with pick:", challengeePick);
      if (onPickMade) onPickMade();

    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert("Failed to accept challenge");
    }
  };

  const submitH2HAccept = async () => {
    if (!user?.uid || !selectedPick) return;

    try {
      const betRef = doc(db, "bets", bet.id);

      // For CLOSEST_GUESS, challengee enters their own number
      await updateDoc(betRef, {
        h2hStatus: "accepted",
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

  // Share bet handler
  const handleShareBet = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation

    const shareUrl = generateBetShareLink(bet.id);
    const success = await copyToClipboard(shareUrl);

    if (success) {
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } else {
      alert("Failed to copy link to clipboard");
    }
  };

  // Collapsed/Expanded state management
  const [isExpanded, setIsExpanded] = useState(false);

  // Base styles matching Figma exactly
  const baseStyle = {
    width: '345px',
    borderRadius: '6px',
    border: '1px solid #FF6B35',
    background: '#18181B',
    boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
  };

  // Collapsed state - Figma design exact match
  if (!isExpanded) {
    return (
      <li className="list-none">
        <div
          onClick={() => setIsExpanded(true)}
          className={`
            w-full
            bg-zinc-900/40
            rounded-md
            p-3
            flex flex-col gap-1
            cursor-pointer
            hover:bg-zinc-900/50
            transition-all
            ${isClosingSoon ? 'shadow-[2px_2px_4px_0px_#ff6b35] animate-pulse-shadow' : ''}
          `}
        >
          {/* Row 1: Group Name (left) and Closing Time (right) */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
              {groupName || 'Group'}
            </p>
            <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
              Closes: {formatClosingDate(bet.closingAt)}
            </p>
          </div>

          {/* Row 2: Bet Title */}
          <div className="flex items-center w-full">
            <p className="text-white text-[12px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] line-clamp-2">
              {bet.title}
            </p>
          </div>

          {/* Row 3: Pot Info (left) and Chevron (right) */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
              Pot: ${(bet.totalPot || 0).toFixed(2)} | {(bet.participants || []).length} Players
            </p>
            <ChevronDown className="w-[14px] h-[14px] text-white flex-shrink-0" />
          </div>
        </div>
      </li>
    );
  }

  // Expanded state - 246px height with full functionality
  return (
    <li className="list-none relative">
      <div
        className="flex flex-col items-start gap-1 relative transition-all duration-300"
        style={{
          ...baseStyle,
          height: 'auto',
          minHeight: '246px',
          padding: '12px 12px 43px 12px',
          zIndex: isExpanded ? 1000 : 1,
        }}
      >
      {/* Header with share button */}
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex-1 flex items-center justify-between pr-10">
          <span className="text-xs text-zinc-400">
            {isH2H ? 'H2H' : (groupName || 'Group')}
          </span>
          <span className="text-xs text-orange-500">
            {getClosingTimeDisplay()}
          </span>
        </div>

        {/* Share button - absolute positioned */}
        <button
          onClick={handleShareBet}
          className="absolute top-2 right-2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          style={{ zIndex: 10 }}
          aria-label="Share bet"
        >
          <Link className="w-4 h-4 text-zinc-400" />
          {showShareSuccess && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
              Link copied!
            </span>
          )}
        </button>

        {/* Delete button for creator - absolute positioned near share */}
        {isCreator && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="absolute top-2 right-14 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
            style={{ zIndex: 10 }}
            aria-label="Delete bet"
          >
            <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
          </button>
        )}
      </div>

      {/* Title section */}
      <div className="w-full mb-2">
        <h2 className="text-lg font-bold text-white line-clamp-1 mb-0.5">
          {bet.title}
        </h2>
        {bet.description && (
          <p className="text-xs text-zinc-400 line-clamp-1 mb-0.5">
            {bet.description}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          {bet.type === "YES_NO" ? "Yes/No" : bet.type === "OVER_UNDER" ? `Over/Under ${bet.line !== undefined ? `(${bet.line})` : ''}` : "Closest Guess"}
        </p>
      </div>

      {/* Stats section */}
      <div className="w-full mb-2 space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white">Wager:</span>
          <span className="text-orange-500 font-semibold">
            ${wager.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white">Pot:</span>
          <span className="text-orange-500 font-semibold">
            ${pot.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-zinc-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{people} Player{people !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* H2H DECLINED STATE */}
      {isH2H && bet.h2hStatus === "declined" && (
        <div className="mb-3 bg-red-900/20 rounded-lg p-4 border border-red-500/30 text-center">
          <div className="bg-red-500 rounded-full px-3 py-1.5 mb-2 inline-block">
            <span className="text-xs sm:text-sm text-white font-bold">DECLINED</span>
          </div>
          <p className="text-sm text-red-300">
            {isChallenger
              ? `${bet.challengeeName} declined your challenge.`
              : `You declined this challenge.`
            }
          </p>
        </div>
      )}

      {/* H2H ACTIVE - DISPLAY BOTH PICKS */}
      {isH2H && bet.h2hStatus === "accepted" && bet.picks && bet.picks[bet.challengerId] && bet.picks[bet.challengeeId] && (
        <div className="mb-3 bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center justify-between gap-3">
            {/* Challenger Pick */}
            <div className="flex-1 text-center">
              <p className="text-[10px] sm:text-xs text-zinc-400 mb-1">
                {bet.challengerName}
              </p>
              <p className="text-lg sm:text-2xl font-bold text-purple-400">
                {bet.picks[bet.challengerId]}
              </p>
            </div>

            {/* VS Divider */}
            <div className="text-sm sm:text-base font-bold text-zinc-500">
              VS
            </div>

            {/* Challengee Pick */}
            <div className="flex-1 text-center">
              <p className="text-[10px] sm:text-xs text-zinc-400 mb-1">
                {bet.challengeeName}
              </p>
              <p className="text-lg sm:text-2xl font-bold text-purple-400">
                {bet.picks[bet.challengeeId]}
              </p>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-zinc-400">
              {isClosed ? "Waiting for result..." : `Closes ${getClosingTimeDisplay()}`}
            </p>
          </div>
        </div>
      )}

      {/* H2H PENDING - CHALLENGER VIEW (waiting for response) */}
      {isH2H && isPending && isChallenger && bet.picks && bet.picks[bet.challengerId] && (
        <div className="mb-3 bg-purple-900/20 rounded-lg p-4 border border-purple-500/30 text-center">
          <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-3 py-1.5 mb-2 inline-block">
            <span className="text-xs sm:text-sm text-purple-400 font-medium">WAITING RESPONSE</span>
          </div>
          <p className="text-sm text-purple-300 mb-2">
            You picked: <span className="font-bold">{bet.picks[bet.challengerId]}</span>
          </p>
          <p className="text-xs text-zinc-400">
            Waiting for {bet.challengeeName} to respond...
          </p>
        </div>
      )}

      {/* ACCEPT/REJECT BUTTONS - Only show for challengee when pending */}
      {bet.isH2H && bet.h2hStatus === "pending" && user?.uid === bet.challengeeId && (
        <div className="mb-3 bg-zinc-800/50 rounded-lg p-3 border border-purple-500/30">
          <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-3 py-1.5 mb-3 inline-block">
            <span className="text-xs sm:text-sm text-purple-400 font-bold">RESPOND NOW</span>
          </div>

          {/* Show what challenger picked if they have picked */}
          {bet.picks && bet.picks[bet.challengerId] && (
            <div className="mb-3 p-2 bg-zinc-900 rounded-lg border border-purple-500/20">
              <p className="text-xs sm:text-sm text-zinc-400">
                {bet.challengerName} picked: <span className="text-purple-400 font-semibold">{bet.picks[bet.challengerId]}</span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptChallenge();
              }}
              className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors text-sm sm:text-base"
              style={{ backgroundColor: '#10B981' }}
            >
              ACCEPT
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeclineChallenge();
              }}
              className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors text-sm sm:text-base"
              style={{ backgroundColor: '#EF4444' }}
            >
              DECLINE
            </button>
          </div>
        </div>
      )}

      {/* Judge Button */}
      {needsJudging && (
        <div className="mb-3">
          <div className="bg-amber-900 text-white text-center py-2 px-4 rounded-lg mb-3 font-bold text-xs sm:text-sm">
            JUDGE BET!
          </div>
          <button
            onClick={() => onJudge(bet)}
            className="w-full py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg transition"
          >
            ⚖️ Select Winner
          </button>
        </div>
      )}

      {/* Void/Push Display - Show when bet is voided */}
      {bet.status === "VOID" && user?.uid && (
        <div className="mt-2">
          <div className="bg-zinc-800/50 border-2 border-zinc-600 rounded-xl p-4">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-zinc-400 mb-1">
                BET VOIDED
              </div>
              <div className="text-sm text-gray-400 mb-2">
                {bet.voidReason || "All wagers returned"}
              </div>

              {/* For OVER_UNDER push, show the details */}
              {bet.type === "OVER_UNDER" && bet.actualValue !== undefined && bet.line !== undefined && (
                <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-gray-400">Line:</span>
                    <span className="font-semibold text-orange-400">{bet.line}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-gray-400">Actual:</span>
                    <span className="font-semibold text-white">{bet.actualValue}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-gray-400">Result:</span>
                    <span className="font-semibold text-zinc-400">PUSH</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winner/Loser Display - Show after bet is judged */}
      {bet.status === "JUDGED" && user?.uid && (
        <div className="mt-2">
          {(() => {
            const isWinner = bet.winners?.includes(user.uid);
            const payout = bet.payoutPerWinner;
            const userPick = bet.picks?.[user.uid];

            if (isWinner) {
              return (
                <div className="bg-emerald-900/50 border-2 border-green-500 rounded-xl p-4">
                  <div className="text-center mb-2">
                    <div className="text-lg sm:text-xl font-bold text-white mb-1">
                      🏆 YOU WON! 🏆
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-500 mb-2">
                      +${payout?.toFixed(2)}
                    </div>

                    {/* For OVER_UNDER bets, show detailed results */}
                    {bet.type === "OVER_UNDER" && bet.actualValue !== undefined && bet.line !== undefined && (
                      <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Line:</span>
                          <span className="font-semibold text-orange-400">{bet.line}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Actual:</span>
                          <span className="font-semibold text-white">{bet.actualValue}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Result:</span>
                          <span className="font-semibold text-green-400">{bet.winningChoice}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-xs text-gray-300">
                            You Voted: <span className="text-green-400 font-semibold">{userPick} ✓</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* For other bet types, show simple result */}
                    {bet.type !== "OVER_UNDER" && (
                      <div className="text-xs sm:text-sm text-gray-300">
                        Final Result: <span className="font-semibold text-white">{bet.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              return (
                <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-4">
                  <div className="text-center mb-2">
                    <div className="text-sm sm:text-base text-gray-300 mb-1">
                      Better luck next time
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-red-500 mb-2">
                      -${wager.toFixed(2)}
                    </div>

                    {/* For OVER_UNDER bets, show detailed results */}
                    {bet.type === "OVER_UNDER" && bet.actualValue !== undefined && bet.line !== undefined && (
                      <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Line:</span>
                          <span className="font-semibold text-orange-400">{bet.line}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Actual:</span>
                          <span className="font-semibold text-white">{bet.actualValue}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-400">Result:</span>
                          <span className="font-semibold text-red-400">{bet.winningChoice}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-xs text-gray-300">
                            You Voted: <span className="text-red-400 font-semibold">{userPick}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* For other bet types, show simple result */}
                    {bet.type !== "OVER_UNDER" && (
                      <div className="text-xs sm:text-sm text-gray-300">
                        Final Result: <span className="font-semibold text-white">{bet.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Options buttons section - simplified for Figma specs */}
      {canVote && !userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="w-full grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPick(bet, bet.type === "YES_NO" ? "YES" : "OVER");
            }}
            className={`py-2 px-3 rounded-md font-semibold text-xs transition-colors ${
              yes >= 50
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400'
            }`}
            style={{ minHeight: '36px' }}
          >
            {bet.type === "YES_NO" ? "YES" : "OVER"} {yes}%
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPick(bet, bet.type === "YES_NO" ? "NO" : "UNDER");
            }}
            className={`py-2 px-3 rounded-md font-semibold text-xs transition-colors ${
              no >= 50
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400'
            }`}
            style={{ minHeight: '36px' }}
          >
            {bet.type === "YES_NO" ? "NO" : "UNDER"} {no}%
          </button>
        </div>
      )}

      {/* Show pick status if user has voted */}
      {canVote && userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="w-full mb-2">
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-white">
                You Voted: <span className="text-orange-400">{bet.picks[user?.uid]}</span>
              </span>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-2">
            <div className={`py-2 px-3 rounded-md font-semibold text-xs text-center ${
              yes >= 50 ? 'bg-orange-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`} style={{ minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {bet.type === "YES_NO" ? "YES" : "OVER"} {yes}%
            </div>
            <div className={`py-2 px-3 rounded-md font-semibold text-xs text-center ${
              no >= 50 ? 'bg-orange-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`} style={{ minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {bet.type === "YES_NO" ? "NO" : "UNDER"} {no}%
            </div>
          </div>
        </div>
      )}

      {/* Closest Guess interface */}
      {canVote && bet.type === "CLOSEST_GUESS" && !userHasPicked && (
        <div className="w-full flex items-center gap-2 mb-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter guess..."
            id={`guess-${bet.id}`}
            className="flex-1 bg-zinc-800 text-white text-xs p-2.5 min-h-[36px] rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 transition"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const value = (document.getElementById(`guess-${bet.id}`) as HTMLInputElement)?.value;
              if (!value || !value.trim()) return alert("Please enter a guess.");
              const numValue = parseFloat(value);
              const finalValue = isNaN(numValue) ? value.trim() : numValue;
              onPick(bet, finalValue);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2.5 min-h-[36px] rounded-lg transition"
          >
            Submit
          </button>
        </div>
      )}

      {canVote && bet.type === "CLOSEST_GUESS" && userHasPicked && (
        <div className="w-full mb-2 bg-emerald-900/40 border border-emerald-700 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-semibold text-white">
              Your Guess: <span className="text-orange-400">{bet.picks[user.uid]}</span>
            </span>
          </div>
        </div>
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
                className="flex-1 px-4 py-3 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-800/50 text-white rounded-lg text-sm transition-all active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteBet}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 min-h-[44px] bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-red-500/50 text-white rounded-lg text-sm transition-all active:scale-95"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick Modal for H2H Accept - CLOSEST_GUESS only */}
      {showPickModal && bet.type === "CLOSEST_GUESS" && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPickModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-purple-500 p-6 max-w-md w-full relative z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Accept Challenge - Enter Your Guess
            </h3>

            <p className="text-zinc-400 text-sm mb-4">
              {bet.title}
            </p>

            {/* Show challenger's guess if available */}
            {bet.picks && bet.picks[bet.challengerId] && (
              <div className="mb-4 p-2 bg-zinc-800 rounded-lg border border-purple-500/20">
                <p className="text-xs text-zinc-400">
                  {bet.challengerName}'s guess: <span className="text-purple-400 font-semibold">{bet.picks[bet.challengerId]}</span>
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Enter your guess:</label>
              <input
                type="text"
                value={selectedPick}
                onChange={(e) => setSelectedPick(e.target.value)}
                placeholder="Enter a number..."
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            {bet.type !== "CLOSEST_GUESS" && (
              <p className="text-xs text-zinc-500 mb-4 text-center">
                💡 Tip: Pick the opposite side to compete head-to-head!
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPickModal(false);
                  setSelectedPick("");
                }}
                className="flex-1 py-3 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-lg font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={submitH2HAccept}
                disabled={!selectedPick || !selectedPick.trim()}
                className="flex-1 py-3 min-h-[44px] bg-purple-500 hover:bg-purple-600 active:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg font-semibold transition-all active:scale-95"
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
                className="flex-1 py-3 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-lg font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={confirmDecline}
                className="flex-1 py-3 min-h-[44px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg font-semibold transition-all active:scale-95"
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
                    className={`w-full p-3 min-h-[44px] rounded-lg border-2 transition-all active:scale-95 ${
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
                    className={`w-full p-3 min-h-[44px] rounded-lg border-2 transition-all active:scale-95 ${
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
                    className={`w-full p-3 min-h-[44px] rounded-lg border-2 transition-all active:scale-95 ${
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
                    className={`w-full p-3 min-h-[44px] rounded-lg border-2 transition-all active:scale-95 ${
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
                className="flex-1 py-3 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-lg font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>

              <button
                onClick={handleChangeVote}
                disabled={!newVoteChoice}
                className={`flex-1 py-3 min-h-[44px] ${
                  isH2H
                    ? 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 disabled:bg-zinc-800'
                    : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-zinc-800'
                } disabled:text-zinc-500 text-white rounded-lg font-semibold transition-all active:scale-95`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapse button - positioned at bottom right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(false);
        }}
        className="absolute bottom-2 right-2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors"
        style={{ zIndex: 10 }}
      >
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      </div>
    </li>
  );
}
export default React.memo<ActiveBetCardProps>(ActiveBetCard);
