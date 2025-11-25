"use client";

import { useState, useMemo } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ChevronDown, ChevronUp, Share2, User } from 'lucide-react';

interface ActiveBetCardProps {
  bet: {
    id: string;
    title: string;
    description: string;
    type: 'YES_NO' | 'OVER_UNDER' | 'CLOSEST_GUESS';
    groupId: string;
    closingAt: string;
    wagerAmount: number;
    totalPot: number;
    participants: string[];
    picks: { [userId: string]: string };
    status: 'OPEN' | 'CLOSED' | 'JUDGED';
  };
  groupName: string;
  currentUserId: string;
}

export default function ActiveBetCard({ bet, groupName, currentUserId }: ActiveBetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if bet is closing within 1 hour
  const isClosingSoon = useMemo(() => {
    const closingTime = new Date(bet.closingAt).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return (closingTime - now) <= oneHour && (closingTime - now) > 0;
  }, [bet.closingAt]);

  // Format closing time as MM/DD/YYYY
  const formatClosingTime = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Calculate voting percentages
  const percentages = useMemo(() => {
    const picks = Object.values(bet.picks || {});
    const total = picks.length;

    if (total === 0) {
      return bet.type === 'YES_NO'
        ? { yes: 50, no: 50 }
        : { over: 50, under: 50 };
    }

    if (bet.type === 'YES_NO') {
      const yesCount = picks.filter(p => p === 'YES').length;
      const noCount = total - yesCount;
      return {
        yes: Math.round((yesCount / total) * 100),
        no: Math.round((noCount / total) * 100)
      };
    } else {
      const overCount = picks.filter(p => p === 'OVER').length;
      const underCount = total - overCount;
      return {
        over: Math.round((overCount / total) * 100),
        under: Math.round((underCount / total) * 100)
      };
    }
  }, [bet.picks, bet.type]);

  // Check if user has voted and what they voted
  const userHasVoted = bet.picks && bet.picks[currentUserId];
  const userPick = bet.picks?.[currentUserId];

  // Handle vote submission
  const handleVote = async (pick: string) => {
    if (userHasVoted) return;

    try {
      const betRef = doc(db, 'bets', bet.id);
      await updateDoc(betRef, {
        [`picks.${currentUserId}`]: pick,
        participants: arrayUnion(currentUserId)
      });

      // Show confirmation
      alert('Vote submitted!');

      // Collapse card
      setIsExpanded(false);

    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  // Handle share link
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/bets/${bet.id}/vote`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy link');
    }
  };

  // Collapsed state
  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className={`
          bg-zinc-900/40
          rounded-md
          p-3
          flex flex-col gap-1
          cursor-pointer
          hover:bg-zinc-900/50
          transition-all
          ${isClosingSoon ? 'pulse-shadow' : 'shadow-[2px_2px_4px_0px_rgba(255,107,53,0.3)]'}
        `}
      >
        {/* Top Row */}
        <div className="flex items-center justify-between w-full">
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {groupName}
          </p>
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Closes: {formatClosingTime(bet.closingAt)}
          </p>
        </div>

        {/* Bet Title Row */}
        <div className="flex items-center w-full">
          <p className="text-white text-[12px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.title}
          </p>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between w-full h-[12px]">
          <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Pot: ${bet.totalPot.toFixed(2)} | {bet.participants.length} Players
          </p>
          <ChevronDown className="w-[14px] h-[14px] text-white" />
        </div>
      </div>
    );
  }

  // Expanded state - YES/NO bet type
  if (bet.type === 'YES_NO') {
    return (
      <div className="bg-zinc-900 border border-[#ff6b35] rounded-md p-3 flex flex-col gap-1">
        {/* Top Row */}
        <div className="flex items-center justify-between w-full">
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {groupName}
          </p>
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Closes: {formatClosingTime(bet.closingAt)}
          </p>
          <button onClick={handleShare} className="p-0 bg-transparent border-0">
            <Share2 className="w-[12px] h-[12px] text-white" />
          </button>
        </div>

        {/* Bet Title */}
        <div className="flex items-center w-full h-[16px]">
          <p className="text-white text-[14px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.title}
          </p>
        </div>

        {/* Description */}
        <div className="flex items-center w-full h-[10px]">
          <p className="text-white text-[10px] italic font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.description}
          </p>
        </div>

        {/* Bet Type Label */}
        <div className="flex items-center w-full h-[10px]">
          <p className="text-white text-[10px] italic font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Yes/No
          </p>
        </div>

        {/* Spacer */}
        <div className="h-[12px]" />

        {/* Wager */}
        <div className="flex items-center w-full h-[12px]">
          <p className="text-white text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Wager: ${bet.wagerAmount.toFixed(2)}
          </p>
        </div>

        {/* Payout */}
        <div className="flex items-center w-full h-[12px]">
          <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Payout: ${bet.totalPot.toFixed(2)}
          </p>
        </div>

        {/* Players Count */}
        <div className="flex items-center gap-1 w-full h-[12px]">
          <User className="w-[12px] h-[12px] text-white" />
          <p className="text-white text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.participants.length} Players
          </p>
        </div>

        {/* Spacer */}
        <div className="h-[18px]" />

        {/* Voting Buttons */}
        <div className="flex gap-[10px] h-[44px] w-full">
          <button
            onClick={() => handleVote("NO")}
            disabled={userHasVoted}
            className={`
              flex-1 rounded-md flex items-center justify-center
              ${userPick === "NO"
                ? 'bg-[rgba(255,107,53,0.52)]'
                : 'bg-zinc-800'
              }
              ${userHasVoted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-zinc-700'}
            `}
          >
            <p className="text-white text-[10px] font-semibold font-montserrat">
              NO {percentages.no}%
            </p>
          </button>

          <button
            onClick={() => handleVote("YES")}
            disabled={userHasVoted}
            className={`
              flex-1 rounded-md flex items-center justify-center
              ${userPick === "YES"
                ? 'bg-[rgba(255,107,53,0.52)]'
                : 'bg-zinc-800'
              }
              ${userHasVoted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-[rgba(255,107,53,0.65)]'}
            `}
          >
            <p className="text-white text-[10px] font-semibold font-montserrat">
              YES {percentages.yes}%
            </p>
          </button>
        </div>

        {/* Collapse Chevrons */}
        <div className="flex items-center justify-between w-full h-[12px] mt-2">
          <button onClick={() => setIsExpanded(false)} className="p-0 bg-transparent border-0">
            <ChevronUp className="w-[14px] h-[14px] text-[#b3b3b3]" />
          </button>
          <button onClick={() => setIsExpanded(false)} className="p-0 bg-transparent border-0">
            <ChevronUp className="w-[14px] h-[14px] text-[#b3b3b3]" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded state - OVER/UNDER bet type
  if (bet.type === 'OVER_UNDER') {
    return (
      <div className="bg-zinc-900 border border-[#ff6b35] rounded-md p-3 flex flex-col gap-1">
        {/* Top Row */}
        <div className="flex items-center justify-between w-full">
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {groupName}
          </p>
          <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Closes: {formatClosingTime(bet.closingAt)}
          </p>
          <button onClick={handleShare} className="p-0 bg-transparent border-0">
            <Share2 className="w-[12px] h-[12px] text-white" />
          </button>
        </div>

        {/* Bet Title */}
        <div className="flex items-center w-full h-[16px]">
          <p className="text-white text-[14px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.title}
          </p>
        </div>

        {/* Description */}
        <div className="flex items-center w-full h-[10px]">
          <p className="text-white text-[10px] italic font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.description}
          </p>
        </div>

        {/* Bet Type Label */}
        <div className="flex items-center w-full h-[10px]">
          <p className="text-white text-[10px] italic font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Over/Under
          </p>
        </div>

        {/* Spacer */}
        <div className="h-[12px]" />

        {/* Wager */}
        <div className="flex items-center w-full h-[12px]">
          <p className="text-white text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Wager: ${bet.wagerAmount.toFixed(2)}
          </p>
        </div>

        {/* Payout */}
        <div className="flex items-center w-full h-[12px]">
          <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            Payout: ${bet.totalPot.toFixed(2)}
          </p>
        </div>

        {/* Players Count */}
        <div className="flex items-center gap-1 w-full h-[12px]">
          <User className="w-[12px] h-[12px] text-white" />
          <p className="text-white text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
            {bet.participants.length} Players
          </p>
        </div>

        {/* Spacer */}
        <div className="h-[18px]" />

        {/* Voting Buttons */}
        <div className="flex gap-[10px] h-[44px] w-full">
          <button
            onClick={() => handleVote("UNDER")}
            disabled={userHasVoted}
            className={`
              flex-1 rounded-md flex items-center justify-center
              ${userPick === "UNDER"
                ? 'bg-[rgba(255,107,53,0.52)]'
                : 'bg-zinc-800'
              }
              ${userHasVoted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-zinc-700'}
            `}
          >
            <p className="text-white text-[10px] font-semibold font-montserrat">
              UNDER {percentages.under}%
            </p>
          </button>

          <button
            onClick={() => handleVote("OVER")}
            disabled={userHasVoted}
            className={`
              flex-1 rounded-md flex items-center justify-center
              ${userPick === "OVER"
                ? 'bg-[rgba(255,107,53,0.52)]'
                : 'bg-zinc-800'
              }
              ${userHasVoted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-[rgba(255,107,53,0.65)]'}
            `}
          >
            <p className="text-white text-[10px] font-semibold font-montserrat">
              OVER {percentages.over}%
            </p>
          </button>
        </div>

        {/* Collapse Chevrons */}
        <div className="flex items-center justify-between w-full h-[12px] mt-2">
          <button onClick={() => setIsExpanded(false)} className="p-0 bg-transparent border-0">
            <ChevronUp className="w-[14px] h-[14px] text-[#b3b3b3]" />
          </button>
          <button onClick={() => setIsExpanded(false)} className="p-0 bg-transparent border-0">
            <ChevronUp className="w-[14px] h-[14px] text-[#b3b3b3]" />
          </button>
        </div>
      </div>
    );
  }

  // For CLOSEST_GUESS, return collapsed state for now (not in requirements)
  return (
    <div
      onClick={() => setIsExpanded(true)}
      className={`
        bg-zinc-900/40
        rounded-md
        p-3
        flex flex-col gap-1
        cursor-pointer
        hover:bg-zinc-900/50
        transition-all
        ${isClosingSoon ? 'pulse-shadow' : 'shadow-[2px_2px_4px_0px_rgba(255,107,53,0.3)]'}
      `}
    >
      {/* Top Row */}
      <div className="flex items-center justify-between w-full">
        <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          {groupName}
        </p>
        <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          Closes: {formatClosingTime(bet.closingAt)}
        </p>
      </div>

      {/* Bet Title Row */}
      <div className="flex items-center w-full">
        <p className="text-white text-[12px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          {bet.title}
        </p>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between w-full h-[12px]">
        <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
          Pot: ${bet.totalPot.toFixed(2)} | {bet.participants.length} Players
        </p>
        <ChevronDown className="w-[14px] h-[14px] text-white" />
      </div>
    </div>
  );
}
