"use client";

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface ActiveBetCardProps {
  bet: {
    id: string;
    title: string;
    description?: string;
    type: 'YES_NO' | 'OVER_UNDER' | 'CLOSEST_GUESS';
    betTheme?: 'group' | 'friend'; // Determines color scheme
    groupId?: string;
    groupName?: string;
    friendId?: string;
    friendName?: string;
    creatorId: string;
    closingAt: string;
    wagerAmount: number;
    totalPot: number;
    participants: string[];
    picks?: { [userId: string]: string };
    status: 'OPEN' | 'PENDING' | 'CLOSED' | 'JUDGE' | 'VOID';
    voidReason?: 'TIE' | 'NO_VOTES';
    line?: number; // For OVER/UNDER bets
    result?: string | number; // Final result for CLOSED bets
    winnerId?: string; // For CLOSED bets
  };
  currentUserId: string;
  onVote?: (pick: string) => Promise<void>;
  onAcceptH2H?: (pick: string) => Promise<void>;
  onDeclineH2H?: () => Promise<void>;
  onJudge?: (result: string | number) => Promise<void>;
}

export default function ActiveBetCard({ 
  bet, 
  currentUserId,
  onVote,
  onAcceptH2H,
  onDeclineH2H,
  onJudge
}: ActiveBetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [judgeInput, setJudgeInput] = useState('');
  const [isVoting, setIsVoting] = useState(false);

  // Determine if this is an H2H bet
  const isH2H = bet.betTheme === 'friend' && bet.friendId;
  
  // Determine theme colors
  const isGroupBet = !isH2H;
  const themeColor = isH2H ? 'purple' : 'orange';

  // Check if closing within 1 hour
  const isClosingSoon = useMemo(() => {
    if (!bet.closingAt || bet.status !== 'OPEN') return false;
    const closingTime = new Date(bet.closingAt).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return (closingTime - now) <= oneHour && (closingTime - now) > 0;
  }, [bet.closingAt, bet.status]);

  // Format closing date
  const formatClosingDate = (isoString: string) => {
    if (!isoString) return 'TBD';
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get user's pick
  const userPick = bet.picks?.[currentUserId];
  const hasVoted = !!userPick;

  // Get opponent's pick (for H2H)
  const opponentId = isH2H ? (bet.friendId === currentUserId ? bet.creatorId : bet.friendId) : null;
  const opponentPick = opponentId ? bet.picks?.[opponentId] : null;
  const opponentName = bet.friendId === currentUserId 
    ? 'Opponent' 
    : bet.friendName || 'Opponent';

  // Calculate percentages
  const calculatePercentages = () => {
    if (!bet.picks) return { option1: 50, option2: 50 };
    
    const picks = Object.values(bet.picks);
    if (picks.length === 0) return { option1: 50, option2: 50 };

    let option1Count = 0;
    let option2Count = 0;

    if (bet.type === 'YES_NO') {
      option1Count = picks.filter(p => p === 'NO').length;
      option2Count = picks.filter(p => p === 'YES').length;
    } else if (bet.type === 'OVER_UNDER') {
      option1Count = picks.filter(p => p === 'UNDER').length;
      option2Count = picks.filter(p => p === 'OVER').length;
    }

    const total = option1Count + option2Count;
    if (total === 0) return { option1: 50, option2: 50 };

    return {
      option1: Math.round((option1Count / total) * 100),
      option2: Math.round((option2Count / total) * 100)
    };
  };

  const percentages = calculatePercentages();

  // Determine if user won/lost
  const didUserWin = bet.status === 'CLOSED' && bet.winnerId === currentUserId;
  const didUserLose = bet.status === 'CLOSED' && bet.winnerId && bet.winnerId !== currentUserId && hasVoted;

  // Get status badge
  const getStatusBadge = () => {
    if (bet.status === 'VOID') {
      if (bet.voidReason === 'NO_VOTES') {
        return { text: 'VOID | NO VOTES', color: 'text-[#ff6b35]' };
      } else if (bet.voidReason === 'TIE') {
        return { text: 'VOID | TIE', color: 'text-[#ff6b35]' };
      }
      return { text: 'VOID', color: 'text-[#ff6b35]' };
    }
    
    if (bet.status === 'JUDGE') {
      return { text: 'JUDGE!', color: 'text-red-500' };
    }
    
    if (bet.status === 'CLOSED') {
      return { text: 'CLOSED', color: 'text-red-500' };
    }
    
    if (bet.status === 'PENDING') {
      return { text: 'PENDING', color: 'text-[#ff6b35]' };
    }
    
    // OPEN status
    return { text: `Closes: ${formatClosingDate(bet.closingAt)}`, color: 'text-[#ff6b35]' };
  };

  const statusBadge = getStatusBadge();

  // Handle vote
  const handleVote = async (pick: string) => {
    if (!onVote || isVoting) return;
    setIsVoting(true);
    try {
      await onVote(pick);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle H2H accept
  const handleAcceptH2H = async (pick: string) => {
    if (!onAcceptH2H || isVoting) return;
    setIsVoting(true);
    try {
      await onAcceptH2H(pick);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle H2H decline
  const handleDeclineH2H = async () => {
    if (!onDeclineH2H || isVoting) return;
    setIsVoting(true);
    try {
      await onDeclineH2H();
    } finally {
      setIsVoting(false);
    }
  };

  // Handle judge
  const handleJudge = async () => {
    if (!onJudge || !judgeInput.trim() || isVoting) return;
    setIsVoting(true);
    try {
      const result = bet.type === 'OVER_UNDER' ? parseFloat(judgeInput) : judgeInput;
      await onJudge(result);
      setJudgeInput('');
    } finally {
      setIsVoting(false);
    }
  };

  // Get display name
  const displayName = isH2H 
    ? `${bet.friendName || 'Friend'} v. ${currentUserId === bet.creatorId ? 'You' : 'Opponent'}`
    : bet.groupName || 'Group';

  // Get border color based on theme and status
  const getBorderColor = () => {
    if (isH2H) {
      return 'border-purple-500/50';
    }
    return 'border-[#ff6b35]/50';
  };

  return (
    <>
      {/* COLLAPSED STATE */}
      {!isExpanded && (
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
            w-full
            ${isClosingSoon ? 'shadow-[2px_2px_4px_0px_#ff6b35] animate-pulse-shadow' : ''}
          `}
        >
          {/* Row 1: Group/Friend Name (left) and Status (right) */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[#ff6b35] text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
              {displayName}
            </p>
            <p className={`${statusBadge.color} text-[8px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]`}>
              {statusBadge.text}
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
      )}

      {/* EXPANDED STATE */}
      {isExpanded && (
        <div 
          className={`
            bg-zinc-900/95
            rounded-lg
            border-2 ${getBorderColor()}
            p-4
            flex flex-col gap-3
            w-full
            backdrop-blur-sm
          `}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[#ff6b35] text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
                {displayName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className={`${statusBadge.color} text-[10px] font-semibold font-montserrat [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]`}>
                {statusBadge.text}
              </p>
              <button className="text-[#ff6b35] hover:text-[#ff8c5c] transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bet Title */}
          <h3 className="text-white text-[16px] font-bold font-montserrat leading-tight">
            {bet.title}
          </h3>

          {/* Bet Description */}
          {bet.description && (
            <p className="text-white/70 text-[12px] font-montserrat italic">
              {bet.description}
            </p>
          )}

          {/* Bet Type Label */}
          <div className="flex items-center gap-2">
            <p className="text-white/70 text-[12px] font-montserrat">
              {bet.type === 'YES_NO' ? 'Yes/No' : 'Over/Under'}
            </p>
            {bet.type === 'OVER_UNDER' && bet.line && (
              <p className="text-[#ff6b35] text-[12px] font-semibold font-montserrat">
                Line: {bet.line}
              </p>
            )}
          </div>

          {/* Wager & Payout Info */}
          <div className="flex items-center gap-4 text-[12px] font-montserrat">
            <div>
              <span className="text-white">Wager: </span>
              <span className="text-white font-semibold">${bet.wagerAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white">Payout: </span>
              <span className={`font-semibold ${
                didUserWin ? 'text-[#1bec09]' : didUserLose ? 'text-red-500' : 'text-[#ff6b35]'
              }`}>
                {didUserWin ? `+ $${bet.totalPot.toFixed(2)}` : 
                 didUserLose ? `- $${bet.wagerAmount.toFixed(2)}` : 
                 `$${bet.totalPot.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-white text-[10px]">{bet.participants.length} Players</span>
            </div>
          </div>

          {/* VOTING/RESULTS SECTION */}
          <div className="flex flex-col gap-2 mt-2">
            
            {/* OPEN BET - User hasn't voted yet */}
            {bet.status === 'OPEN' && !hasVoted && !isH2H && (
              <div className="grid grid-cols-2 gap-2">
                {bet.type === 'YES_NO' ? (
                  <>
                    <button
                      onClick={() => handleVote('NO')}
                      disabled={isVoting}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      NO {percentages.option1}%
                    </button>
                    <button
                      onClick={() => handleVote('YES')}
                      disabled={isVoting}
                      className="bg-[#ff6b35] hover:bg-[#ff8c5c] text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      YES {percentages.option2}%
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleVote('UNDER')}
                      disabled={isVoting}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      UNDER {percentages.option1}%
                    </button>
                    <button
                      onClick={() => handleVote('OVER')}
                      disabled={isVoting}
                      className="bg-[#ff6b35] hover:bg-[#ff8c5c] text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      OVER {percentages.option2}%
                    </button>
                  </>
                )}
              </div>
            )}

            {/* OPEN BET - User has voted (GROUP) */}
            {bet.status === 'OPEN' && hasVoted && !isH2H && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'NO' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'YES' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'UNDER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'OVER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[#ff6b35] text-[12px] font-semibold text-center">
                  Your Pick: {userPick}
                </p>
              </>
            )}

            {/* H2H - Waiting for user to accept/decline */}
            {isH2H && bet.status === 'OPEN' && !hasVoted && opponentPick && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDeclineH2H}
                    disabled={isVoting}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                  >
                    DECLINE
                  </button>
                  <button
                    onClick={() => handleAcceptH2H(bet.type === 'YES_NO' ? (opponentPick === 'YES' ? 'NO' : 'YES') : (opponentPick === 'OVER' ? 'UNDER' : 'OVER'))}
                    disabled={isVoting}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
                  >
                    ACCEPT ({bet.type === 'YES_NO' ? (opponentPick === 'YES' ? 'NO' : 'YES') : (opponentPick === 'OVER' ? 'UNDER' : 'OVER')})
                  </button>
                </div>
                <p className="text-purple-400 text-[12px] font-semibold text-center">
                  {opponentName}'s Pick: {opponentPick}
                </p>
              </>
            )}

            {/* H2H - Waiting for opponent */}
            {isH2H && bet.status === 'OPEN' && hasVoted && !opponentPick && (
              <>
                <div className="bg-zinc-800 py-3 rounded-md text-center">
                  <p className="text-white font-semibold">Waiting for Opponent</p>
                </div>
                <p className="text-purple-400 text-[12px] font-semibold text-center">
                  Your Pick: {userPick}
                </p>
              </>
            )}

            {/* H2H - Both voted, PENDING */}
            {isH2H && bet.status === 'PENDING' && hasVoted && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'NO' || opponentPick === 'NO' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'YES' || opponentPick === 'YES' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'UNDER' || opponentPick === 'UNDER' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'OVER' || opponentPick === 'OVER' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                <p className="text-purple-400 text-[12px] font-semibold text-center">
                  Your Pick: {userPick}
                </p>
              </>
            )}

            {/* PENDING - Group bet */}
            {bet.status === 'PENDING' && hasVoted && !isH2H && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'NO' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'YES' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'UNDER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'OVER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[#ff6b35] text-[12px] font-semibold text-center">
                  Your Pick: {userPick}
                </p>
              </>
            )}

            {/* CLOSED - Won */}
            {bet.status === 'CLOSED' && didUserWin && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        bet.result === 'NO' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        bet.result === 'YES' ? 'bg-[#1bec09] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        (bet.result && typeof bet.result === 'number' && bet.result < (bet.line || 0)) ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        (bet.result && typeof bet.result === 'number' && bet.result > (bet.line || 0)) ? 'bg-[#1bec09] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                {bet.type === 'OVER_UNDER' && bet.result && (
                  <p className="text-[#1bec09] text-[12px] font-semibold text-center">
                    Actual: {bet.result} | Your Pick: {userPick}
                  </p>
                )}
                {bet.type === 'YES_NO' && (
                  <p className="text-[#1bec09] text-[12px] font-semibold text-center">
                    Your Pick: {userPick} | You Won!
                  </p>
                )}
              </>
            )}

            {/* CLOSED - Lost */}
            {bet.status === 'CLOSED' && didUserLose && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        bet.result === 'NO' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        bet.result === 'YES' ? 'bg-[#1bec09] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        (bet.result && typeof bet.result === 'number' && bet.result < (bet.line || 0)) ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        (bet.result && typeof bet.result === 'number' && bet.result > (bet.line || 0)) ? 'bg-[#1bec09] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                {bet.type === 'OVER_UNDER' && bet.result && (
                  <p className="text-red-500 text-[12px] font-semibold text-center">
                    Actual: {bet.result} | Your Pick: {userPick}
                  </p>
                )}
                {bet.type === 'YES_NO' && (
                  <p className="text-red-500 text-[12px] font-semibold text-center">
                    Your Pick: {userPick} | You Lost!
                  </p>
                )}
              </>
            )}

            {/* JUDGE - Input field */}
            {bet.status === 'JUDGE' && bet.creatorId === currentUserId && (
              <>
                <div className="flex gap-2">
                  <input
                    type={bet.type === 'OVER_UNDER' ? 'number' : 'text'}
                    value={judgeInput}
                    onChange={(e) => setJudgeInput(e.target.value)}
                    placeholder="Actual..."
                    className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-md text-sm font-montserrat focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                  <button
                    onClick={handleJudge}
                    disabled={!judgeInput.trim() || isVoting}
                    className="bg-[#ff6b35] hover:bg-[#ff8c5c] text-white font-semibold px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    SUBMIT
                  </button>
                </div>
              </>
            )}

            {/* JUDGE - Waiting for judge (not creator) */}
            {bet.status === 'JUDGE' && bet.creatorId !== currentUserId && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'NO' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'YES' ? 'bg-[#1bec09] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold bg-zinc-800 text-white`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold bg-zinc-800 text-white`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* VOID - TIE */}
            {bet.status === 'VOID' && bet.voidReason === 'TIE' && hasVoted && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'NO' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        NO {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'YES' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'UNDER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        UNDER {percentages.option1}%
                      </div>
                      <div className={`py-3 rounded-md text-center font-semibold ${
                        userPick === 'OVER' ? 'bg-[#ff6b35] text-white' : 'bg-zinc-800 text-white'
                      }`}>
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[#ff6b35] text-[12px] font-semibold text-center">
                  Your Pick: {userPick}
                </p>
              </>
            )}

            {/* VOID - NO VOTES */}
            {bet.status === 'VOID' && bet.voidReason === 'NO_VOTES' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {bet.type === 'YES_NO' ? (
                    <>
                      <div className="py-3 rounded-md text-center font-semibold bg-zinc-800 text-white">
                        NO {percentages.option1}%
                      </div>
                      <div className="py-3 rounded-md text-center font-semibold bg-[#ff6b35] text-white">
                        YES {percentages.option2}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="py-3 rounded-md text-center font-semibold bg-zinc-800 text-white">
                        UNDER {percentages.option1}%
                      </div>
                      <div className="py-3 rounded-md text-center font-semibold bg-[#ff6b35] text-white">
                        OVER {percentages.option2}%
                      </div>
                    </>
                  )}
                </div>
                {hasVoted && (
                  <p className="text-[#ff6b35] text-[12px] font-semibold text-center">
                    Your Pick: {userPick}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center justify-center gap-1 text-white/50 hover:text-white transition-colors mt-2"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
