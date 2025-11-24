"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Bet, GroupBetCard, GroupBetCardProps } from "./bets/GroupBetCard";
import { Grid3X3, Layers, X } from "lucide-react";

interface CardStackProps {
  cards: Bet[];
  currentUserId: string;
  onDismiss?: (cardId: string) => void;
  onSeeAll?: () => void;
  // Pass through GroupBetCard props
  groupNameGetter?: (groupId: string) => string;
  onVote?: (betId: string, vote: string) => void;
  onSubmitGuess?: (betId: string, guess: number) => void;
  onChangeVote?: (betId: string) => void;
  onJudge?: (betId: string, result: any) => void;
  onDeclareWinner?: (betId: string, winnerId: string) => void;
  onDelete?: (betId: string) => void;
  onAcceptChallenge?: (betId: string) => void;
  onDeclineChallenge?: (betId: string) => void;
}

// Preview card component - shows only essential info
function PreviewCard({
  bet,
  stackPosition,
  themeColor
}: {
  bet: Bet;
  stackPosition: number;
  themeColor: string;
}) {
  const textShadow = "[text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]";

  // Get closing time display
  const getClosingTimeDisplay = () => {
    if (!bet.closingAt) return "No close time";

    const now = Date.now();
    const closingTime = new Date(bet.closingAt).getTime();

    if (isNaN(closingTime)) return "No close time";
    if (closingTime <= now) return "CLOSED";

    const timeUntilClose = closingTime - now;
    const hours = Math.floor(timeUntilClose / (60 * 60 * 1000));
    const days = Math.floor(timeUntilClose / (24 * 60 * 60 * 1000));

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      const minutes = Math.floor(timeUntilClose / (60 * 1000));
      return `${minutes}m`;
    }
  };

  // Get bet type icon
  const getBetTypeIcon = () => {
    switch (bet.type) {
      case "YES_NO":
        return "?";
      case "OVER_UNDER":
        return "O/U";
      case "CLOSEST_GUESS":
        return "#";
      default:
        return "?";
    }
  };

  return (
    <div
      className="w-full bg-[#1E293B] rounded-xl px-4 py-3 border border-[#334155] relative overflow-hidden"
      style={{
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Bet type icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${textShadow}`}
            style={{ backgroundColor: themeColor, color: 'white' }}
          >
            {getBetTypeIcon()}
          </span>
          <p className={`text-sm font-semibold text-white truncate ${textShadow}`}>
            {bet.title}
          </p>
        </div>

        {/* Right: Closing time */}
        <span
          className={`text-xs font-semibold ml-2 flex-shrink-0 ${textShadow}`}
          style={{ color: themeColor }}
        >
          {getClosingTimeDisplay()}
        </span>
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-[#1E293B] to-transparent" />
    </div>
  );
}

export default function CardStack({
  cards,
  currentUserId,
  onDismiss,
  onSeeAll,
  groupNameGetter,
  onVote,
  onSubmitGuess,
  onChangeVote,
  onJudge,
  onDeclareWinner,
  onDelete,
  onAcceptChallenge,
  onDeclineChallenge,
}: CardStackProps) {
  const [visibleCards, setVisibleCards] = useState(cards);
  const [dismissedCards, setDismissedCards] = useState<string[]>([]);
  const [dragY, setDragY] = useState(0);
  const [showAllBetsModal, setShowAllBetsModal] = useState(false);

  // Update visible cards when cards prop changes
  useEffect(() => {
    setVisibleCards(cards.filter(card => !dismissedCards.includes(card.id)));
  }, [cards, dismissedCards]);

  // Handle card dismiss
  const dismissCard = (cardId: string) => {
    setDismissedCards(prev => [...prev, cardId]);
    onDismiss?.(cardId);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Handle drag end
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
    cardId: string
  ) => {
    const { offset, velocity } = info;

    // Swipe up to dismiss
    if (offset.y < -100 || velocity.y < -500) {
      dismissCard(cardId);
    }

    setDragY(0);
  };

  // Get theme color for card
  const getThemeColor = (bet: Bet) => {
    const isH2H = !!bet.friendId && !bet.groupId;
    return isH2H ? '#A855F7' : '#FF6B35';
  };

  // Empty state
  if (visibleCards.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-zinc-400 mb-2">No active bets</p>
        <p className="text-sm text-zinc-500">Create a bet or join one to get started</p>
      </div>
    );
  }

  // Single card - no stack needed
  if (visibleCards.length === 1) {
    const bet = visibleCards[0];
    return (
      <div className="px-4">
        <GroupBetCard
          bet={bet}
          currentUserId={currentUserId}
          groupName={bet.groupId && groupNameGetter ? groupNameGetter(bet.groupId) : undefined}
          onVote={onVote}
          onSubmitGuess={onSubmitGuess}
          onChangeVote={onChangeVote}
          onJudge={onJudge}
          onDeclareWinner={onDeclareWinner}
          onDelete={onDelete}
          onAcceptChallenge={onAcceptChallenge}
          onDeclineChallenge={onDeclineChallenge}
        />
      </div>
    );
  }

  // Multiple cards - show stack
  const stackedCards = visibleCards.slice(0, 3);
  const stackLayers = stackedCards
    .map((bet, stackPosition) => ({ bet, stackPosition }))
    .reverse(); // Render from back to front so the top card is last in the DOM
  const stackConfig = {
    baseZIndex: 300,
    yOffsetStep: 30,
    scaleStep: 0.02,
    widthStep: 3,
    opacityStep: 0.08
  };

  return (
    <>
    <div className="relative px-4" style={{ minHeight: "320px", paddingBottom: "60px" }}>
      {/* Stacked cards container */}
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {stackLayers.map(({ bet, stackPosition }) => {
            const isTopCard = stackPosition === 0;
            const themeColor = getThemeColor(bet);
            const stackIndex = index;

            // Calculate stack styling - Apple Wallet style
            const baseZIndex = 200;
            const scale = isTopCard ? 1 : 1 - stackIndex * 0.02; // Subtle scale reduction for previews
            const offsetY = stackIndex * 30; // 30px offset per card
            const opacity = 1 - stackIndex * 0.08;
            const zIndex = baseZIndex - stackIndex; // Explicit z-index ordering

            // Width calculation for preview cards
            const widthPercent = isTopCard ? 100 : 100 - stackIndex * 3;

            return (
              <motion.div
                key={bet.id}
                layout
                initial={{
                  y: -50,
                  opacity: 0,
                  scale: 0.9
                }}
                animate={{
                  y: offsetY,
                  opacity: opacity,
                  scale: scale,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.3,
                    delay: stackPosition * 0.03
                  }
                }}
                exit={{
                  y: -300,
                  opacity: 0,
                  scale: 0.8,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }
                }}
                style={{
                  position: stackPosition === 0 ? "relative" : "absolute",
                  top: 0,
                  left: `${leftOffsetPercent}%`,
                  width: `${widthPercent}%`,
                  zIndex: zIndex,
                  // Add shadow for depth effect
                  filter: stackPosition > 0 ? `drop-shadow(0 ${stackPosition * 4}px ${stackPosition * 8}px rgba(0,0,0,${0.2 + stackPosition * 0.1}))` : 'none',
                }}
                drag={isTopCard ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDrag={(e, info) => {
                  if (isTopCard) {
                    setDragY(info.offset.y);
                  }
                }}
                onDragEnd={(e, info) => {
                  if (isTopCard) {
                    handleDragEnd(e, info, bet.id);
                  }
                }}
              >
                {isTopCard ? (
                  // Full card for top position
                  <div
                    className="cursor-grab active:cursor-grabbing"
                    style={{
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                      borderRadius: "12px"
                    }}
                  >
                    <GroupBetCard
                      bet={bet}
                      currentUserId={currentUserId}
                      groupName={bet.groupId && groupNameGetter ? groupNameGetter(bet.groupId) : undefined}
                      onVote={onVote}
                      onSubmitGuess={onSubmitGuess}
                      onChangeVote={onChangeVote}
                      onJudge={onJudge}
                      onDeclareWinner={onDeclareWinner}
                      onDelete={onDelete}
                      onAcceptChallenge={onAcceptChallenge}
                      onDeclineChallenge={onDeclineChallenge}
                    />

                    {/* Drag indicator */}
                    {dragY < -20 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-xs text-slate-400"
                      >
                        ↑ Release to dismiss
                      </motion.div>
                    )}
                  </div>
                ) : (
                  // Preview card for stacked positions
                  <PreviewCard
                    bet={bet}
                    stackPosition={stackPosition}
                    themeColor={themeColor}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* "See All X Bets" button - Apple Wallet style */}
      {visibleCards.length > 3 && (
        <button
          onClick={() => setShowAllBetsModal(true)}
          className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-medium hover:bg-zinc-800 hover:border-zinc-700 transition-colors mt-4"
          style={{
            transform: `translateY(${Math.min(3, visibleCards.length - 1) * 30}px)`,
            position: 'relative',
            zIndex: 1,
          }}
        >
          See All {visibleCards.length} Bets
        </button>
      )}

      {/* Small "See All" link when 3 or fewer cards */}
      {visibleCards.length <= 3 && visibleCards.length > 1 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowAllBetsModal(true)}
            className="text-blue-500 font-medium text-sm hover:text-blue-400 transition"
          >
            See all {cards.length} bets →
          </button>
        </div>
      )}
    </div>

    {/* Full Page Modal for "See All" */}
    {showAllBetsModal && (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/80 backdrop-blur-sm py-4 -mx-4 px-4 z-10">
            <h2 className="text-xl font-bold text-white">All Active Bets ({visibleCards.length})</h2>
            <button
              onClick={() => setShowAllBetsModal(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          {/* All bets grid */}
          <div className="space-y-4 max-w-2xl mx-auto pb-8">
            {visibleCards.map(bet => (
              <GroupBetCard
                key={bet.id}
                bet={bet}
                currentUserId={currentUserId}
                groupName={bet.groupId && groupNameGetter ? groupNameGetter(bet.groupId) : undefined}
                onVote={onVote}
                onSubmitGuess={onSubmitGuess}
                onChangeVote={onChangeVote}
                onJudge={onJudge}
                onDeclareWinner={onDeclareWinner}
                onDelete={onDelete}
                onAcceptChallenge={onAcceptChallenge}
                onDeclineChallenge={onDeclineChallenge}
              />
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// Grid view component for "See all" mode
export function BetGrid({
  cards,
  currentUserId,
  groupNameGetter,
  onVote,
  onSubmitGuess,
  onChangeVote,
  onJudge,
  onDeclareWinner,
  onDelete,
  onAcceptChallenge,
  onDeclineChallenge,
  onBackToStack,
}: CardStackProps & { onBackToStack?: () => void }) {
  return (
    <div className="px-4">
      {/* Back to stack button */}
      {onBackToStack && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onBackToStack}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition"
          >
            <Layers size={16} />
            Stack view
          </button>
        </div>
      )}

      {/* Grid of cards */}
      <div className="space-y-3">
        {cards.map((bet) => (
          <GroupBetCard
            key={bet.id}
            bet={bet}
            currentUserId={currentUserId}
            groupName={bet.groupId && groupNameGetter ? groupNameGetter(bet.groupId) : undefined}
            onVote={onVote}
            onSubmitGuess={onSubmitGuess}
            onChangeVote={onChangeVote}
            onJudge={onJudge}
            onDeclareWinner={onDeclareWinner}
            onDelete={onDelete}
            onAcceptChallenge={onAcceptChallenge}
            onDeclineChallenge={onDeclineChallenge}
          />
        ))}
      </div>
    </div>
  );
}

// View toggle button component
export function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: "stack" | "grid";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
      aria-label={viewMode === "stack" ? "Switch to grid view" : "Switch to stack view"}
    >
      {viewMode === "stack" ? (
        <Grid3X3 size={18} className="text-slate-400" />
      ) : (
        <Layers size={18} className="text-slate-400" />
      )}
    </button>
  );
}
