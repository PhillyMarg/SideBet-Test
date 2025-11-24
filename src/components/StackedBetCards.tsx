'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Share2, Users } from 'lucide-react';
import { Bet } from './bets/GroupBetCard';
import { getLivePercentages } from '../utils/timeUtils';

interface StackedBetCardsProps {
  bets: Bet[];
  currentUserId: string;
  groupNameGetter?: (groupId: string) => string;
  onVote?: (betId: string, vote: string) => void;
  onSubmitGuess?: (betId: string, guess: number) => void;
}

// ============ HELPER FUNCTIONS ============

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${month}/${day}/${year} ${displayHours}:${minutes}${ampm}`;
}

function calculatePayout(bet: Bet): number {
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  return wager * people;
}

function getBetOptions(bet: Bet): { label: string; value: string }[] {
  if (bet.type === 'YES_NO') {
    return [
      { label: 'Yes', value: 'YES' },
      { label: 'No', value: 'NO' }
    ];
  } else if (bet.type === 'OVER_UNDER' && bet.line !== undefined) {
    return [
      { label: `Over ${bet.line}`, value: 'OVER' },
      { label: `Under ${bet.line}`, value: 'UNDER' }
    ];
  }
  return [];
}

function calculatePercentage(bet: Bet, optionValue: string): number {
  if (!bet.picks) return 0;

  const values = Object.values(bet.picks);
  const total = values.filter((v) => v !== null && v !== undefined).length;

  if (total === 0) return 0;

  const count = values.filter((v) => {
    if (optionValue === 'YES' || optionValue === 'OVER') {
      return v === 'YES' || v === 'OVER';
    } else {
      return v === 'NO' || v === 'UNDER';
    }
  }).length;

  return Math.round((count / total) * 100);
}

function getBetTypeLabel(type: string): string {
  switch (type) {
    case 'YES_NO':
      return 'Yes/No Question';
    case 'OVER_UNDER':
      return 'Over/Under';
    case 'CLOSEST_GUESS':
      return 'Closest Guess';
    default:
      return type;
  }
}

// ============ COLLAPSED CARD COMPONENT ============

interface CollapsedBetCardProps {
  bet: Bet;
  style: React.CSSProperties;
  groupName?: string;
}

function CollapsedBetCard({ bet, style, groupName }: CollapsedBetCardProps) {
  const isH2H = !!bet.friendId && !bet.groupId;
  const displayName = isH2H ? 'H2H' : (groupName || 'Group Bet');

  return (
    <div
      className="px-4 py-3 bg-zinc-900 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer"
      style={{
        ...style,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-orange-500">
          {displayName}
        </span>
        <span className="text-xs font-semibold text-orange-500">
          Closes: {formatDate(bet.closingAt)}
        </span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white truncate flex-1 pr-2">
          {bet.title}
        </h3>
        <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      </div>
    </div>
  );
}

// ============ EXPANDED CARD COMPONENT ============

interface ExpandedBetCardProps {
  bet: Bet;
  currentUserId: string;
  groupName?: string;
  onCollapse: () => void;
  onVote?: (betId: string, vote: string) => void;
  onSubmitGuess?: (betId: string, guess: number) => void;
}

function ExpandedBetCard({
  bet,
  currentUserId,
  groupName,
  onCollapse,
  onVote,
  onSubmitGuess
}: ExpandedBetCardProps) {
  const [guessInput, setGuessInput] = useState('');
  const userPick = bet.picks?.[currentUserId];
  const isH2H = !!bet.friendId && !bet.groupId;
  const displayName = isH2H ? 'Head-to-Head' : (groupName || 'Group Bet');

  const handleShare = async (betId: string) => {
    const shareUrl = `${window.location.origin}/bets/${betId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: bet.title,
          text: `Check out this bet: ${bet.title}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handlePlaceBet = (betId: string, vote: string) => {
    if (onVote) {
      onVote(betId, vote);
      onCollapse();
    }
  };

  const handleSubmitGuess = () => {
    const guess = parseFloat(guessInput);
    if (!isNaN(guess) && onSubmitGuess) {
      onSubmitGuess(bet.id, guess);
      setGuessInput('');
      onCollapse();
    }
  };

  return (
    <div className="min-h-[340px] p-5 bg-zinc-900 border border-orange-500 rounded-2xl relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {displayName}
            </span>
            <span className="text-xs text-orange-500">
              Closes: {formatDate(bet.closingAt)}
            </span>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare(bet.id);
          }}
          className="absolute top-4 right-4 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
        >
          <Share2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Title section */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-1">
          {bet.title}
        </h2>
        {bet.description && (
          <p className="text-sm text-zinc-400 mb-1">
            {bet.description}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          {getBetTypeLabel(bet.type)}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white">Wager:</span>
          <span className="text-orange-500 font-semibold">
            ${(bet.perUserWager ?? bet.betAmount ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white">Pot:</span>
          <span className="text-orange-500 font-semibold">
            ${calculatePayout(bet).toFixed(2)}
          </span>
        </div>
        <div className="text-sm text-zinc-400">
          <Users className="w-4 h-4 inline mr-1" />
          {bet.participants?.length ?? 0} Players
        </div>
      </div>

      {/* Options or Guess Input */}
      {bet.type === 'CLOSEST_GUESS' ? (
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Your Guess:</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder="Enter your guess"
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              disabled={!!userPick}
            />
            <button
              onClick={handleSubmitGuess}
              disabled={!!userPick}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors"
            >
              Submit
            </button>
          </div>
          {userPick && (
            <p className="text-sm text-green-500 mt-2">
              Your guess: {userPick}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {getBetOptions(bet).map((option) => {
            const percentage = calculatePercentage(bet, option.value);
            const isUserPick = userPick === option.value;
            const isHighest = percentage >= 50;

            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!userPick) {
                    handlePlaceBet(bet.id, option.value);
                  }
                }}
                disabled={!!userPick}
                className={`py-3 px-4 min-h-[48px] rounded-lg font-semibold text-sm transition-colors ${
                  isUserPick
                    ? 'bg-green-600 text-white border-2 border-green-400'
                    : isHighest
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                } ${userPick && !isUserPick ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {option.label.toUpperCase()} {percentage}%
              </button>
            );
          })}
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCollapse();
        }}
        className="absolute bottom-4 right-4 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <ChevronUp className="w-4 h-4 text-zinc-500" />
      </button>
    </div>
  );
}

// ============ MAIN STACKED CARDS COMPONENT ============

export function StackedBetCards({
  bets,
  currentUserId,
  groupNameGetter,
  onVote,
  onSubmitGuess
}: StackedBetCardsProps) {
  // Sort bets by closing time (soonest first)
  const sortedBets = [...bets].sort((a, b) =>
    new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime()
  );

  const [stackOrder, setStackOrder] = useState<string[]>(
    sortedBets.map(b => b.id)
  );
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);

  // Get card style based on position in stack
  const getCardStyle = (index: number): React.CSSProperties => {
    const opacity = Math.max(1 - (index * 0.2), 0.2);
    const borderOpacity = Math.max(opacity, 0.2);
    const scale = 1 - (index * 0.02);
    const translateY = index * 30;

    return {
      borderColor: `rgba(255, 107, 53, ${borderOpacity})`,
      opacity: opacity,
      transform: `translateY(${translateY}px) scale(${scale})`,
      zIndex: 100 - index,
      marginBottom: index < sortedBets.length - 1 ? '-60px' : '0'
    };
  };

  // Navigate through stack
  const navigateCards = (direction: 'next' | 'prev') => {
    setStackOrder(prev => {
      if (direction === 'next') {
        return [...prev.slice(1), prev[0]]; // Move front to back
      } else {
        return [prev[prev.length - 1], ...prev.slice(0, -1)]; // Move back to front
      }
    });
  };

  // Click handler
  const handleCardClick = (betId: string, index: number) => {
    if (expandedBetId) {
      // If something is expanded, collapse it
      setExpandedBetId(null);
      return;
    }

    if (index === 0) {
      // Front card - expand it
      setExpandedBetId(betId);
    } else {
      // Behind card - bring to front
      setStackOrder(prev => {
        const newOrder = prev.filter(id => id !== betId);
        return [betId, ...newOrder];
      });
    }
  };

  // Empty state
  if (sortedBets.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-zinc-400 mb-2">No active bets</p>
        <p className="text-sm text-zinc-500">Create a bet or join one to get started</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6">
      {/* Card stack container */}
      <div className="relative min-h-[180px] mb-8">
        {stackOrder.map((betId, index) => {
          const bet = sortedBets.find(b => b.id === betId);
          if (!bet) return null;

          const isExpanded = expandedBetId === betId;
          const style = getCardStyle(index);
          const groupName = bet.groupId && groupNameGetter ? groupNameGetter(bet.groupId) : undefined;

          return (
            <div
              key={bet.id}
              onClick={() => handleCardClick(bet.id, index)}
              className={`
                relative
                transition-all duration-300 ease-in-out
                cursor-pointer
                ${isExpanded ? 'h-auto' : 'h-[60px]'}
              `}
              style={isExpanded ? { zIndex: 1000, marginBottom: 0 } : style}
            >
              {isExpanded ? (
                <ExpandedBetCard
                  bet={bet}
                  currentUserId={currentUserId}
                  groupName={groupName}
                  onCollapse={() => setExpandedBetId(null)}
                  onVote={onVote}
                  onSubmitGuess={onSubmitGuess}
                />
              ) : (
                <CollapsedBetCard
                  bet={bet}
                  style={style}
                  groupName={groupName}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation controls */}
      {!expandedBetId && sortedBets.length > 1 && (
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => navigateCards('prev')}
            className="p-2.5 min-w-[44px] min-h-[44px] bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
            aria-label="Previous card"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => navigateCards('next')}
            className="p-2.5 min-w-[44px] min-h-[44px] bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
            aria-label="Next card"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
