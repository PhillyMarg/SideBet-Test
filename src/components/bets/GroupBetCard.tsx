"use client";

import React, { useState, useEffect } from "react";
import { Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase/client";
import { fetchUserData, getUserDisplayName } from "../../utils/userUtils";
import { getLivePercentages } from "../../utils/timeUtils";

// ============ TYPES ============
export type BetType = "YES_NO" | "OVER_UNDER" | "CLOSEST_GUESS";
export type BetStatus = "OPEN" | "CLOSED" | "JUDGED" | "VOID";
export type CardState = "ACTIVE" | "PLACED" | "JUDGE" | "WAITING_JUDGEMENT" | "WON" | "LOST";

export interface Bet {
  id: string;
  title: string;
  description?: string;
  type: BetType;
  creatorId: string;
  groupId: string;
  createdAt: string;
  closingAt: string;
  status: BetStatus;
  picks: { [userId: string]: string | number };
  participants: string[];
  winners: string[];
  perUserWager?: number;
  betAmount?: number;
  settings?: { min_bet?: number; max_bet?: number };
  options?: string[];
  line?: number;
  correctAnswer?: string | number;
  actualValue?: number;
  winningChoice?: "OVER" | "UNDER";
  payoutPerWinner?: number;
  judgedAt?: string;
  voidReason?: string;
  isH2H?: boolean;
}

export interface GroupBetCardProps {
  bet: Bet;
  currentUserId: string;
  groupName?: string;
  onVote?: (betId: string, vote: string) => void;
  onSubmitGuess?: (betId: string, guess: number) => void;
  onChangeVote?: (betId: string) => void;
  onJudge?: (betId: string, result: any) => void;
  onDeclareWinner?: (betId: string, winnerId: string) => void;
  onDelete?: (betId: string) => void;
}

// ============ HELPER FUNCTIONS ============

function determineCardState(bet: Bet, userId: string): CardState {
  const isCreator = bet.creatorId === userId;
  const hasVoted = bet.picks && bet.picks[userId] !== undefined;
  const isClosed = bet.status === "CLOSED" || (bet.closingAt && new Date(bet.closingAt).getTime() <= Date.now());
  const hasResult = bet.status === "JUDGED";

  if (hasResult) {
    const userWon = bet.winners?.includes(userId);
    return userWon ? "WON" : "LOST";
  }

  if (isClosed && isCreator && bet.status !== "JUDGED") return "JUDGE";
  if (isClosed && !isCreator && bet.status !== "JUDGED") return "WAITING_JUDGEMENT";
  if (hasVoted) return "PLACED";
  return "ACTIVE";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// ============ MAIN COMPONENT ============

export function GroupBetCard({
  bet,
  currentUserId,
  groupName,
  onVote,
  onSubmitGuess,
  onChangeVote,
  onJudge,
  onDeclareWinner,
  onDelete,
}: GroupBetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<{ [userId: string]: string }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine state
  const isCreator = bet.creatorId === currentUserId;
  const cardState = determineCardState(bet, currentUserId);

  // Calculate values
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const { yes, no } = getLivePercentages(bet);
  const userPick = bet.picks?.[currentUserId];

  // Fetch participant names for expanded sections
  useEffect(() => {
    const fetchNames = async () => {
      const names: { [userId: string]: string } = {};
      for (const participantId of bet.participants || []) {
        const userData = await fetchUserData(participantId);
        names[participantId] = getUserDisplayName(userData);
      }
      setParticipantNames(names);
    };

    if (bet.type === "CLOSEST_GUESS" && (cardState === "WAITING_JUDGEMENT" || cardState === "WON" || cardState === "LOST" || cardState === "JUDGE")) {
      fetchNames();
    }
  }, [bet.participants, bet.type, cardState]);

  // Calculate payout
  const calculatePayout = (): number => {
    if (bet.type === "CLOSEST_GUESS") {
      return pot;
    }

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

  // Handle delete
  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, "bets", bet.id));
      setShowDeleteModal(false);
      onDelete?.(bet.id);
    } catch (error) {
      console.error("Error deleting bet:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get border class based on state
  const getBorderClass = (): string => {
    switch (cardState) {
      case "ACTIVE":
      case "PLACED":
        return "border-2 border-[#ff6b35]";
      case "JUDGE":
      case "WAITING_JUDGEMENT":
        return "border border-[#78350f]";
      case "WON":
        return "border-2 border-[#10b981]";
      case "LOST":
        return "border-2 border-[#ef4444]";
      default:
        return "border-2 border-[#ff6b35]";
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    switch (cardState) {
      case "ACTIVE":
        return (
          <span className="text-[8px] font-semibold text-white">
            Closes: {formatDate(bet.closingAt)}
          </span>
        );
      case "PLACED":
        return (
          <span className="text-[8px] font-semibold text-white">
            Closes: {formatDate(bet.closingAt)}
          </span>
        );
      case "JUDGE":
        return (
          <span className="text-[10px] font-semibold text-[#ff6b35] bg-[#78350f] px-2 py-0.5 rounded">
            JUDGE BET!
          </span>
        );
      case "WAITING_JUDGEMENT":
        return (
          <span className="text-[8px] font-semibold text-[#a1a1aa]">
            Waiting Judgement
          </span>
        );
      case "WON":
        return (
          <span className="text-[10px] font-semibold text-white bg-[#10b981] px-2 py-0.5 rounded">
            YOU WON!
          </span>
        );
      case "LOST":
        return (
          <span className="text-[10px] font-semibold text-white bg-[#ef4444] px-2 py-0.5 rounded">
            YOU LOST!
          </span>
        );
      default:
        return null;
    }
  };

  // Render voting buttons for ACTIVE state
  const renderVotingButtons = () => {
    if (bet.type === "YES_NO") {
      return (
        <div className="flex gap-[10px]">
          <button
            onClick={() => onVote?.(bet.id, "YES")}
            className="flex-1 h-[20px] bg-[#ff6b35] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            YES
          </button>
          <button
            onClick={() => onVote?.(bet.id, "NO")}
            className="flex-1 h-[20px] bg-white text-zinc-900 rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            NO
          </button>
        </div>
      );
    }

    if (bet.type === "OVER_UNDER") {
      return (
        <div className="flex gap-[10px]">
          <button
            onClick={() => onVote?.(bet.id, "OVER")}
            className="flex-1 h-[20px] bg-[#ff6b35] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            OVER
          </button>
          <button
            onClick={() => onVote?.(bet.id, "UNDER")}
            className="flex-1 h-[20px] bg-white text-zinc-900 rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            UNDER
          </button>
        </div>
      );
    }

    if (bet.type === "CLOSEST_GUESS") {
      return (
        <div className="flex gap-2">
          <input
            type="number"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Enter guess"
            className="flex-1 h-[20px] bg-[#1c1917] text-white rounded-[6px] text-[10px] px-2 border border-[#78350f]"
          />
          <button
            onClick={() => {
              if (guessInput) {
                onSubmitGuess?.(bet.id, parseFloat(guessInput));
                setGuessInput("");
              }
            }}
            className="h-[20px] bg-[#ff6b35] text-white rounded-[6px] text-[10px] font-semibold px-4 flex items-center justify-center"
          >
            SUBMIT
          </button>
        </div>
      );
    }

    return null;
  };

  // Render placed state (user has voted)
  const renderPlacedContent = () => {
    const displayPick = userPick as string;

    return (
      <>
        <div className="text-[8px] font-semibold">
          <span className="text-white">You Voted: {displayPick} | </span>
          <span className="text-[#ff6b35]">Payout: {formatCurrency(calculatePayout())}</span>
        </div>

        {/* Progress bar for YES_NO and OVER_UNDER */}
        {(bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
          <div className="mt-2">
            <div className="flex justify-between text-[8px] font-semibold mb-1">
              <span className="text-white">{bet.type === "YES_NO" ? "YES" : "OVER"} {formatPercent(yes)}</span>
              <span className="text-white">{bet.type === "YES_NO" ? "NO" : "UNDER"} {formatPercent(no)}</span>
            </div>
            <div className="h-1 bg-[#3f3f3f] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff6b35]"
                style={{ width: `${yes}%` }}
              />
            </div>
          </div>
        )}
      </>
    );
  };

  // Render judge state
  const renderJudgeContent = () => {
    if (bet.type === "YES_NO") {
      return (
        <div className="flex gap-[10px]">
          <button
            onClick={() => onJudge?.(bet.id, { correctAnswer: "YES" })}
            className="flex-1 h-[40px] bg-[#10b981] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            YES
          </button>
          <button
            onClick={() => onJudge?.(bet.id, { correctAnswer: "NO" })}
            className="flex-1 h-[40px] bg-[#ef4444] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            NO
          </button>
        </div>
      );
    }

    if (bet.type === "OVER_UNDER") {
      return (
        <div className="flex gap-[10px]">
          <button
            onClick={() => onJudge?.(bet.id, { winningChoice: "OVER" })}
            className="flex-1 h-[40px] bg-[#10b981] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            OVER
          </button>
          <button
            onClick={() => onJudge?.(bet.id, { winningChoice: "UNDER" })}
            className="flex-1 h-[40px] bg-[#ef4444] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
          >
            UNDER
          </button>
        </div>
      );
    }

    if (bet.type === "CLOSEST_GUESS") {
      // Get sorted guesses
      const guesses = Object.entries(bet.picks || {}).map(([id, guess]) => ({
        id,
        name: participantNames[id] || "Unknown",
        guess: guess as number,
      })).sort((a, b) => a.guess - b.guess);

      return (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full h-[31px] bg-[#1c1917] border-2 border-[#ff6b35] rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE GUESSES" : "SEE GUESSES"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t border-[rgba(255,107,53,0.2)]">
              <div className="space-y-2">
                {guesses.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-[8px]"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedWinner(entry.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedWinner === entry.id
                            ? "bg-[#ff6b35] border-[#ff6b35]"
                            : "border-[#78350f]"
                        }`}
                      >
                        {selectedWinner === entry.id && <Check size={10} className="text-white" />}
                      </button>
                      <span className={`font-semibold ${entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}`}>
                        {entry.name}
                      </span>
                    </div>
                    <span className={`font-semibold ${entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}`}>
                      {entry.guess}
                    </span>
                  </div>
                ))}
              </div>
              {selectedWinner && (
                <button
                  onClick={() => onDeclareWinner?.(bet.id, selectedWinner)}
                  className="mt-3 w-full h-[31px] bg-[#10b981] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center"
                >
                  DECLARE WINNER
                </button>
              )}
            </div>
          )}
        </>
      );
    }

    return null;
  };

  // Render waiting judgement state
  const renderWaitingContent = () => {
    if (bet.type === "CLOSEST_GUESS") {
      // Get sorted guesses
      const guesses = Object.entries(bet.picks || {}).map(([id, guess]) => ({
        id,
        name: participantNames[id] || "Unknown",
        guess: guess as number,
      })).sort((a, b) => a.guess - b.guess);

      return (
        <>
          <div className="text-[8px] font-semibold text-[#a1a1aa]">
            Your Guess: {bet.picks?.[currentUserId] || "N/A"}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full h-[31px] bg-[#1c1917] border-2 border-[#ff6b35] rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE GUESSES" : "SEE GUESSES"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t border-[rgba(255,107,53,0.2)]">
              <div className="space-y-2">
                {guesses.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-[8px] font-semibold"
                  >
                    <span className={entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}>
                      {entry.name}
                    </span>
                    <span className={entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}>
                      {entry.guess}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    // YES_NO and OVER_UNDER
    return (
      <div className="text-[8px] font-semibold">
        <span className="text-white">You Voted: {userPick as string} | </span>
        <span className="text-[#ff6b35]">Payout: {formatCurrency(calculatePayout())}</span>
      </div>
    );
  };

  // Render won/lost state
  const renderResultContent = () => {
    const didWin = cardState === "WON";

    if (bet.type === "CLOSEST_GUESS") {
      // Get sorted guesses with rankings
      const guesses = Object.entries(bet.picks || {}).map(([id, guess]) => ({
        id,
        name: participantNames[id] || "Unknown",
        guess: guess as number,
        isWinner: bet.winners?.includes(id),
      })).sort((a, b) => {
        // Winners first, then by guess
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        return a.guess - b.guess;
      });

      return (
        <>
          <div className="text-[8px] font-semibold">
            <span className="text-white">Your Guess: {bet.picks?.[currentUserId]} | </span>
            <span className={didWin ? "text-[#10b981]" : "text-[#ef4444]"}>
              {didWin ? `Won: ${formatCurrency(bet.payoutPerWinner || pot)}` : "Lost"}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full h-[31px] bg-[#1c1917] border-2 border-[#ff6b35] rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE RESULTS" : "SEE RESULTS"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t border-[rgba(255,107,53,0.2)]">
              <div className="space-y-2">
                {guesses.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-[8px] font-semibold"
                  >
                    <span className={entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}>
                      {index + 1}. {entry.name} {entry.isWinner && "🏆"}
                    </span>
                    <span className={entry.id === currentUserId ? "text-[#ff6b35]" : "text-white"}>
                      {entry.guess}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    // YES_NO and OVER_UNDER
    return (
      <div className="text-[8px] font-semibold">
        <span className="text-white">You Voted: {userPick as string} | </span>
        <span className={didWin ? "text-[#10b981]" : "text-[#ef4444]"}>
          {didWin ? `Won: ${formatCurrency(bet.payoutPerWinner || calculatePayout())}` : "Lost"}
        </span>
      </div>
    );
  };

  // Main render
  return (
    <div
      className={`relative w-full max-w-[393px] bg-[#18181b] rounded-[6px] p-3 ${getBorderClass()}`}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Delete button */}
      {isCreator && !["WON", "LOST"].includes(cardState) && (
        <button
          onClick={() => setShowDeleteModal(true)}
          className="absolute top-2 right-2 text-white hover:text-[#ef4444] transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1">
          {/* Group badge */}
          {groupName && (
            <span className="text-[8px] font-semibold text-[#ff6b35]">
              {groupName}
            </span>
          )}
          {/* Title */}
          <h3 className="text-[12px] font-semibold text-white leading-tight">
            {bet.title}
          </h3>
        </div>
        {/* Status badge */}
        <div className="flex-shrink-0 mt-1">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Wager info */}
      <div className="text-[8px] font-semibold mb-1">
        <span className="text-white">Wager: {formatCurrency(wager)} | </span>
        <span className="text-[#ff6b35]">Total Pot: {formatCurrency(pot)}</span>
      </div>

      {/* Players count */}
      <div className="text-[8px] font-semibold text-white mb-2">
        Players: {people}
      </div>

      {/* O/U Line for OVER_UNDER type */}
      {bet.type === "OVER_UNDER" && bet.line !== undefined && (
        <div className="text-[8px] font-extrabold text-[#ff6b35] mb-2">
          O/U Line: {bet.line}
        </div>
      )}

      {/* State-specific content */}
      {cardState === "ACTIVE" && renderVotingButtons()}
      {cardState === "PLACED" && renderPlacedContent()}
      {cardState === "JUDGE" && renderJudgeContent()}
      {cardState === "WAITING_JUDGEMENT" && renderWaitingContent()}
      {(cardState === "WON" || cardState === "LOST") && renderResultContent()}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181b] rounded-lg p-4 max-w-sm mx-4 border border-[#78350f]">
            <h4 className="text-white font-semibold mb-2">Delete Bet?</h4>
            <p className="text-[#a1a1aa] text-sm mb-4">
              Are you sure you want to delete this bet? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-[#3f3f3f] text-white rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-[#ef4444] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupBetCard;
