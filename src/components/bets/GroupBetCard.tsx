"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase/client";
import { fetchUserData, getUserDisplayName } from "../../utils/userUtils";
import { getLivePercentages } from "../../utils/timeUtils";
import { useCountdown } from "../../hooks/useCountdown";

// ============ TYPES ============
export type BetType = "YES_NO" | "OVER_UNDER" | "CLOSEST_GUESS";
export type BetStatus = "OPEN" | "CLOSED" | "JUDGED" | "VOID";
export type CardState = "ACTIVE" | "PLACED" | "CHALLENGED" | "PENDING" | "JUDGE" | "WAITING_JUDGEMENT" | "WON" | "LOST";

export interface Bet {
  id: string;
  title: string;
  description?: string;
  type: BetType;
  creatorId: string;
  groupId: string;
  friendId?: string;
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
  // H2H specific fields
  challengerId?: string;
  challengeeId?: string;
  challengerName?: string;
  challengeeName?: string;
  h2hStatus?: "pending" | "accepted" | "declined";
  h2hOdds?: { challenger: number; challengee: number };
}

// ============ H2H HELPER FUNCTIONS ============

// Check if bet is a head-to-head (Challenge Friend) bet
function isHeadToHeadBet(bet: Bet): boolean {
  return !!bet.friendId && !bet.groupId;
}

// Get display name for H2H bets (e.g., "Player 1 v. Player 2")
async function getH2HDisplayName(bet: Bet): Promise<string> {
  try {
    // Get creator name
    const creatorData = await fetchUserData(bet.creatorId);
    const creatorName = getUserDisplayName(creatorData);

    // Get friend name
    if (!bet.friendId) return creatorName;

    const friendData = await fetchUserData(bet.friendId);
    const friendName = getUserDisplayName(friendData);

    return `${creatorName} v. ${friendName}`;
  } catch (error) {
    console.error('Error fetching H2H names:', error);
    return 'Head-to-Head';
  }
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
  onAcceptChallenge?: (betId: string) => void;
  onDeclineChallenge?: (betId: string) => void;
}

// ============ VOTE PROGRESS BAR COMPONENT ============

interface VoteProgressBarProps {
  bet: Bet;
  yesPercent: number;
  noPercent: number;
  themeColor: string;
}

function VoteProgressBar({ bet, yesPercent, noPercent, themeColor }: VoteProgressBarProps) {
  const isYesNo = bet.type === 'YES_NO';
  const isOverUnder = bet.type === 'OVER_UNDER';

  if (!isYesNo && !isOverUnder) return null;

  const option1Label = isYesNo ? 'NO' : 'UNDER';
  const option2Label = isYesNo ? 'YES' : 'OVER';

  // option1 is NO/UNDER (left side, dark)
  // option2 is YES/OVER (right side, themed color)
  const option1Width = noPercent;
  const option2Width = yesPercent;

  return (
    <div className="w-full h-[31px] px-[3px] py-[5px]">
      <div
        className="relative h-[20px] w-full bg-[#1e1e1e] border-2 rounded-[6px] overflow-hidden"
        style={{ borderColor: themeColor }}
      >
        {/* Progress Bar Container */}
        <div className="absolute inset-0 flex">
          {/* Option 1 (NO/UNDER) - Dark side */}
          <div
            className="flex items-center justify-center transition-all duration-300"
            style={{
              width: `${option1Width}%`,
              backgroundColor: '#1e1e1e'
            }}
          >
            {option1Width > 15 && (
              <span className="font-montserrat font-semibold text-[10px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
                {option1Label} {option1Width}%
              </span>
            )}
          </div>

          {/* Option 2 (YES/OVER) - Theme color side */}
          <div
            className="flex items-center justify-center transition-all duration-300"
            style={{
              width: `${option2Width}%`,
              backgroundColor: themeColor
            }}
          >
            {option2Width > 15 && (
              <span className="font-montserrat font-semibold text-[10px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
                {option2Label} {option2Width}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ HELPER FUNCTIONS ============

export function determineCardState(bet: Bet, userId: string): CardState {
  const isCreator = bet.creatorId === userId;
  const isClosed = new Date() >= new Date(bet.closingAt);
  const isChallenged = bet.challengeeId === userId;
  const isChallenger = bet.challengerId === userId;

  // ============ H2H PENDING STATES ============
  // Check if this is an H2H bet with pending status
  if (bet.isH2H && bet.h2hStatus === "pending") {
    // User is being challenged - show CHALLENGED state
    if (isChallenged) {
      return 'CHALLENGED';
    }
    // User is the challenger waiting for acceptance - show PENDING state
    if (isChallenger) {
      return 'PENDING';
    }
  }

  // H2H bet was declined - show as LOST for visibility
  if (bet.isH2H && bet.h2hStatus === "declined") {
    return 'LOST';
  }

  // Check if bet has been judged (result exists)
  const hasJudgment =
    (bet.correctAnswer !== undefined && bet.correctAnswer !== null) ||
    (bet.winningChoice !== undefined && bet.winningChoice !== null) ||
    (bet.actualValue !== undefined && bet.actualValue !== null);

  // Check if current user has voted
  const userPick = bet.picks?.[userId];
  const hasVoted = userPick !== undefined && userPick !== null;

  // ============ JUDGED STATES ============
  // Bet has been judged - show WON or LOST
  if (hasJudgment) {
    let userWon = false;

    if (bet.type === 'YES_NO') {
      // For YES/NO: match user's vote with correctAnswer
      userWon = userPick === bet.correctAnswer;
    } else if (bet.type === 'OVER_UNDER') {
      // For OVER/UNDER: match user's vote with winningChoice
      userWon = userPick === bet.winningChoice;
    } else if (bet.type === 'CLOSEST_GUESS') {
      // For CLOSEST_GUESS: check if user is in winners array
      // If winners array exists, use it; otherwise calculate closest guess
      if (bet.winners && bet.winners.length > 0) {
        userWon = bet.winners.includes(userId);
      } else if (bet.actualValue !== undefined && bet.picks) {
        // Fallback: calculate closest guess to actualValue
        const guesses = Object.entries(bet.picks);
        if (guesses.length > 0) {
          const closestEntry = guesses.reduce((closest, [oddsUserId, guess]) => {
            const currentDiff = Math.abs(Number(guess) - Number(bet.actualValue));
            const closestDiff = Math.abs(Number(closest.guess) - Number(bet.actualValue));
            return currentDiff < closestDiff ? { oddsUserId, guess } : closest;
          }, { oddsUserId: guesses[0][0], guess: guesses[0][1] });

          userWon = closestEntry.oddsUserId === userId;
        }
      }
    }

    return userWon ? 'WON' : 'LOST';
  }

  // ============ CLOSED BUT NOT JUDGED ============
  // Bet is closed but creator hasn't judged yet
  if (isClosed) {
    // Creator sees JUDGE (can judge even if they voted)
    if (isCreator) {
      return 'JUDGE';
    }

    // Participants see WAITING_JUDGEMENT
    return 'WAITING_JUDGEMENT';
  }

  // ============ OPEN STATES ============
  // Bet is still open for voting

  // User has voted - show PLACED
  if (hasVoted) {
    return 'PLACED';
  }

  // User hasn't voted yet - show ACTIVE
  return 'ACTIVE';
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
  onAcceptChallenge,
  onDeclineChallenge,
}: GroupBetCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<{ [userId: string]: string }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [h2hDisplayName, setH2hDisplayName] = useState<string>("");
  const [challengerDisplayName, setChallengerDisplayName] = useState<string>("");
  const [challengeeDisplayName, setChallengeeDisplayName] = useState<string>("");

  // Determine if this is an H2H bet
  const isH2H = isHeadToHeadBet(bet);

  // Dynamic theme color: Purple for H2H, Orange for Groups
  const themeColor = isH2H ? '#A855F7' : '#FF6B35';

  // Handler for display name click (group name or H2H names)
  const handleDisplayNameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion if card is clickable

    // Only navigate for group bets, not H2H
    if (!isH2H && bet.groupId) {
      router.push(`/groups/${bet.groupId}`);
    }
  };

  // Determine state
  const isCreator = bet.creatorId === currentUserId;
  const cardState = determineCardState(bet, currentUserId);

  // Fetch H2H display name
  useEffect(() => {
    if (isH2H) {
      getH2HDisplayName(bet).then(setH2hDisplayName);
    }
  }, [bet, isH2H]);

  // Determine display name (H2H names or group name)
  const displayName = isH2H
    ? (h2hDisplayName || 'Loading...')
    : (groupName || 'Unknown Group');

  // Add countdown hook for active/placed/judge/waiting states
  const showCountdown = ['ACTIVE', 'PLACED', 'JUDGE', 'WAITING_JUDGEMENT'].includes(cardState);
  const { timeRemaining, isUnderOneHour, isUnder24Hours } = useCountdown(bet.closingAt);

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

  // Fetch creator name for all states
  useEffect(() => {
    const fetchCreator = async () => {
      const userData = await fetchUserData(bet.creatorId);
      setCreatorName(getUserDisplayName(userData));
    };

    if (bet.creatorId) {
      fetchCreator();
    }
  }, [bet.creatorId]);

  // Fetch challenger/challengee names for H2H states
  useEffect(() => {
    const fetchH2HNames = async () => {
      // Use stored names if available, otherwise fetch
      if (bet.challengerName) {
        setChallengerDisplayName(bet.challengerName);
      } else if (bet.challengerId) {
        const userData = await fetchUserData(bet.challengerId);
        setChallengerDisplayName(getUserDisplayName(userData));
      }

      if (bet.challengeeName) {
        setChallengeeDisplayName(bet.challengeeName);
      } else if (bet.challengeeId) {
        const userData = await fetchUserData(bet.challengeeId);
        setChallengeeDisplayName(getUserDisplayName(userData));
      }
    };

    if (cardState === "CHALLENGED" || cardState === "PENDING") {
      fetchH2HNames();
    }
  }, [bet.challengerId, bet.challengeeId, bet.challengerName, bet.challengeeName, cardState]);

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

  // Get background class based on state
  const getBgClass = (): string => {
    if (cardState === "JUDGE" || cardState === "WAITING_JUDGEMENT") {
      return "bg-[#612914]"; // dark brown
    }
    return "bg-[#18181B]"; // zinc-900
  };

  // Get border class based on state (color will be applied via style)
  const getBorderClass = (): string => {
    switch (cardState) {
      case "ACTIVE":
      case "PLACED":
        return "border-2";
      case "JUDGE":
      case "WAITING_JUDGEMENT":
        return "border";
      case "WON":
        return "border-2 border-[#0ABF00]";
      case "LOST":
        return "border-2 border-[#C21717]";
      default:
        return "border-2";
    }
  };

  // Get border color based on state
  const getBorderColor = (): string | undefined => {
    switch (cardState) {
      case "WON":
      case "LOST":
        return undefined; // Uses Tailwind classes
      default:
        return themeColor;
    }
  };

  // Get padding class based on state
  const getPaddingClass = (): string => {
    if (cardState === "WON" || cardState === "LOST") {
      return "px-[12px] py-[6px]";
    }
    return "p-[12px]";
  };

  // Text shadow class (used on all text)
  const textShadow = "[text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]";

  // Render status badge
  const renderStatusBadge = () => {
    switch (cardState) {
      case "ACTIVE":
      case "PLACED":
        return (
          <span
            className={`text-[8px] font-semibold ${textShadow} ${
              isUnderOneHour ? 'pulse-yellow' : ''
            }`}
            style={{ color: isUnderOneHour ? undefined : (isUnder24Hours ? themeColor : 'white') }}
          >
            Closes: {timeRemaining}
          </span>
        );
      case "JUDGE":
        return (
          <span
            className={`text-[10px] font-extrabold text-white px-2 py-0.5 rounded ${textShadow}`}
            style={{ backgroundColor: themeColor }}
          >
            JUDGE BET!
          </span>
        );
      case "WAITING_JUDGEMENT":
        return (
          <span className={`text-[8px] font-semibold text-white ${textShadow}`}>
            Waiting Judgement
          </span>
        );
      case "WON":
      case "LOST":
        return null; // Won/Lost shows creator and closed info instead
      default:
        return null;
    }
  };

  // Render voting buttons for ACTIVE state
  const renderVotingButtons = () => {
    if (bet.type === "YES_NO") {
      return (
        <div className="h-[40px] px-[3px] py-[5px] flex gap-[10px]">
          <button
            onClick={() => onVote?.(bet.id, "YES")}
            className={`flex-1 h-[20px] px-[37px] py-0 text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${textShadow}`}
            style={{ backgroundColor: themeColor }}
          >
            YES
          </button>
          <button
            onClick={() => onVote?.(bet.id, "NO")}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-white text-[#18181B] rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${textShadow}`}
          >
            NO
          </button>
        </div>
      );
    }

    if (bet.type === "OVER_UNDER") {
      return (
        <div className="h-[40px] px-[3px] py-[5px] flex gap-[10px]">
          <button
            onClick={() => onVote?.(bet.id, "OVER")}
            className={`flex-1 h-[20px] px-[37px] py-0 text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${textShadow}`}
            style={{ backgroundColor: themeColor }}
          >
            OVER
          </button>
          <button
            onClick={() => onVote?.(bet.id, "UNDER")}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-white text-[#18181B] rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${textShadow}`}
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
            className="flex-1 h-[20px] bg-[#18181B] text-white rounded-[6px] text-[10px] px-2 border"
            style={{ borderColor: themeColor }}
          />
          <button
            onClick={() => {
              if (guessInput) {
                onSubmitGuess?.(bet.id, parseFloat(guessInput));
                setGuessInput("");
              }
            }}
            className={`h-[20px] text-white rounded-[6px] text-[10px] font-semibold px-4 flex items-center justify-center ${textShadow}`}
            style={{ backgroundColor: themeColor }}
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
        <div className={`text-[8px] font-semibold ${textShadow}`}>
          <span className="text-white">You Voted: </span>
          <span style={{ color: themeColor }}>{displayPick}</span>
          <span className="text-white"> | </span>
          <span style={{ color: themeColor }}>Payout: {formatCurrency(calculatePayout())}</span>
        </div>

        {/* Progress Bar - Single unified bar */}
        {(bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
          <VoteProgressBar bet={bet} yesPercent={yes} noPercent={no} themeColor={themeColor} />
        )}
      </>
    );
  };

  // Render judge state
  const renderJudgeContent = () => {
    if (bet.type === "YES_NO") {
      return (
        <div className="h-[40px] px-[3px] py-[5px] flex gap-[10px]">
          <button
            onClick={() => onJudge?.(bet.id, { correctAnswer: "NO" })}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-[#C21717] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] ${textShadow}`}
          >
            NO
          </button>
          <button
            onClick={() => onJudge?.(bet.id, { correctAnswer: "YES" })}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-[#0ABF00] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] ${textShadow}`}
          >
            YES
          </button>
        </div>
      );
    }

    if (bet.type === "OVER_UNDER") {
      return (
        <div className="h-[40px] px-[3px] py-[5px] flex gap-[10px]">
          <button
            onClick={() => onJudge?.(bet.id, { winningChoice: "UNDER" })}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-[#C21717] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] ${textShadow}`}
          >
            UNDER
          </button>
          <button
            onClick={() => onJudge?.(bet.id, { winningChoice: "OVER" })}
            className={`flex-1 h-[20px] px-[37px] py-0 bg-[#0ABF00] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] ${textShadow}`}
          >
            OVER
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
            className={`w-full h-[31px] bg-[#18181B] border-2 rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2 ${textShadow}`}
            style={{ borderColor: themeColor }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE GUESSES" : "SEE GUESSES"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t" style={{ borderColor: `${themeColor}33` }}>
              <div className="space-y-2">
                {guesses.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-[8px]"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedWinner(entry.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center`}
                        style={{
                          backgroundColor: selectedWinner === entry.id ? themeColor : 'transparent',
                          borderColor: themeColor
                        }}
                      >
                        {selectedWinner === entry.id && <Check size={10} className="text-white" />}
                      </button>
                      <span
                        className={`font-semibold ${textShadow}`}
                        style={{ color: entry.id === currentUserId ? themeColor : 'white' }}
                      >
                        {entry.name}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${textShadow}`}
                      style={{ color: entry.id === currentUserId ? themeColor : 'white' }}
                    >
                      {entry.guess}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!selectedWinner) {
                    alert('Please select a winner');
                    return;
                  }
                  onDeclareWinner?.(bet.id, selectedWinner);
                }}
                disabled={!selectedWinner}
                className={`mt-3 w-full h-[31px] bg-[#0ABF00] text-white rounded-[6px] text-[10px] font-semibold flex items-center justify-center shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed ${textShadow}`}
              >
                DECLARE WINNER
              </button>
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
          <div className={`text-[8px] font-semibold text-white ${textShadow}`}>
            Your Guess: {bet.picks?.[currentUserId] || "N/A"}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full h-[31px] bg-[#18181B] border-2 rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2 ${textShadow}`}
            style={{ borderColor: themeColor }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE GUESSES" : "SEE GUESSES"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t" style={{ borderColor: `${themeColor}33` }}>
              <div className="space-y-2">
                {guesses.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between text-[8px] font-semibold ${textShadow}`}
                  >
                    <span style={{ color: entry.id === currentUserId ? themeColor : 'white' }}>
                      {entry.name}
                    </span>
                    <span style={{ color: entry.id === currentUserId ? themeColor : 'white' }}>
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
      <div className={`text-[8px] font-semibold ${textShadow}`}>
        <span className="text-white">You Voted: </span>
        <span style={{ color: themeColor }}>{userPick as string}</span>
        <span className="text-white"> | </span>
        <span style={{ color: themeColor }}>Payout: {formatCurrency(calculatePayout())}</span>
      </div>
    );
  };

  // Render won/lost state
  const renderResultContent = () => {
    const didWin = cardState === "WON";
    const payout = bet.payoutPerWinner || calculatePayout();
    const profit = payout - wager;

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
          <div className={`text-[8px] font-semibold ${textShadow}`}>
            <span className="text-white">Your Guess: {bet.picks?.[currentUserId]} | </span>
            <span className={didWin ? "text-[#0ABF00]" : "text-[#C21717]"}>
              {didWin ? `+ ${formatCurrency(profit)}` : "Lost"}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full h-[31px] bg-[#18181B] border-2 rounded-[6px] text-white text-[12px] font-semibold flex items-center justify-center gap-2 ${textShadow}`}
            style={{ borderColor: themeColor }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "HIDE RESULTS" : "SEE RESULTS"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t" style={{ borderColor: `${themeColor}33` }}>
              <div className="space-y-2">
                {guesses.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between text-[8px] font-semibold ${textShadow}`}
                  >
                    <span style={{ color: entry.id === currentUserId ? themeColor : 'white' }}>
                      {index + 1}. {entry.name} {entry.isWinner && "🏆"}
                    </span>
                    <span style={{ color: entry.id === currentUserId ? themeColor : 'white' }}>
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

    // YES_NO and OVER_UNDER - show percentage buttons with won/lost colors
    const userVotedYes = userPick === "YES" || userPick === "OVER";
    const userVotedNo = userPick === "NO" || userPick === "UNDER";

    // Determine which side won
    const correctAnswer = bet.correctAnswer || bet.winningChoice;
    const yesWon = correctAnswer === "YES" || correctAnswer === "OVER";

    return (
      <>
        {/* Wager line with payout */}
        <div className={`text-[8px] font-semibold ${textShadow}`}>
          <span className="text-white">Wager: {formatCurrency(wager)} | </span>
          <span className={didWin ? "text-[#0ABF00]" : "text-[#C21717]"}>
            {didWin ? `+ ${formatCurrency(profit)}` : `- ${formatCurrency(wager)}`}
          </span>
        </div>

        {/* You Voted line */}
        <div className={`text-[8px] font-semibold ${textShadow}`}>
          <span className="text-white">You Voted: </span>
          <span className={didWin ? "text-[#0ABF00]" : "text-[#C21717]"}>
            {userPick as string}
          </span>
        </div>

        {/* Display buttons showing results */}
        <div className="h-[40px] px-[3px] py-[5px] flex gap-[10px]">
          <button
            disabled
            className={`flex-1 h-[20px] px-[37px] py-0 rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${
              yesWon
                ? (userVotedYes ? "bg-[#0B4508] text-[#0ABF00]" : "bg-[#0B4508] text-[#0ABF00]")
                : (userVotedYes ? "bg-[#691616] text-[#C21717]" : "bg-[#691616] text-[#C21717]")
            } ${textShadow}`}
          >
            {bet.type === "YES_NO" ? "YES" : "OVER"} {formatPercent(yes)}
          </button>
          <button
            disabled
            className={`flex-1 h-[20px] px-[37px] py-0 rounded-[6px] text-[10px] font-semibold flex items-center justify-center ${
              !yesWon
                ? (userVotedNo ? "bg-[#0B4508] text-[#0ABF00]" : "bg-[#0B4508] text-[#0ABF00]")
                : (userVotedNo ? "bg-[#691616] text-[#C21717]" : "bg-[#691616] text-[#C21717]")
            } ${textShadow}`}
          >
            {bet.type === "YES_NO" ? "NO" : "UNDER"} {formatPercent(no)}
          </button>
        </div>

        {/* YOU WON! or YOU LOST! text */}
        <div className="text-center mt-1">
          {didWin ? (
            <span className={`text-[10px] font-bold text-[#0ABF00] ${textShadow}`}>
              YOU WON!
            </span>
          ) : (
            <span className={`text-[10px] font-bold text-[#C21717] ${textShadow}`}>
              YOU LOST!
            </span>
          )}
        </div>
      </>
    );
  };

  // Build H2H challenge display name (e.g., "Phil v. Evan")
  const h2hChallengeDisplayName = challengerDisplayName && challengeeDisplayName
    ? `${challengerDisplayName.split(' ')[0]} v. ${challengeeDisplayName.split(' ')[0]}`
    : bet.isH2H ? 'H2H Challenge' : '';

  // === CHALLENGED STATE (User being challenged) ===
  if (cardState === 'CHALLENGED') {
    const themeColor = '#A855F7'; // Purple for H2H

    return (
      <div
        className="bg-[#18181B] rounded-[6px] p-3 space-y-2 border-2"
        style={{ borderColor: themeColor, fontFamily: "'Montserrat', sans-serif" }}
      >
        {/* Row 1: H2H Name (left) + Creator Name (right) */}
        <div className="flex items-center justify-between mb-1">
          <p
            className={`font-semibold text-[8px] ${textShadow}`}
            style={{ color: themeColor }}
          >
            {h2hChallengeDisplayName || 'Challenge'}
          </p>

          <span className={`text-[8px] font-semibold text-[#58585a] ${textShadow}`}>
            Creator: {challengerDisplayName || 'Loading...'}
          </span>
        </div>

        {/* Row 2: Bet Title (left) + Timer (right) */}
        <div className="flex items-center justify-between mb-1">
          {/* Left: Bet Title */}
          <p className={`font-semibold text-[12px] text-white ${textShadow} flex-1 mr-2`}>
            {bet.title}
          </p>

          {/* Right: Timer */}
          <p
            className={`font-semibold text-[8px] ${textShadow} whitespace-nowrap flex-shrink-0 ${
              isUnderOneHour ? 'pulse-yellow' : ''
            }`}
            style={{ color: isUnderOneHour ? undefined : themeColor }}
          >
            Closes: {timeRemaining}
          </p>
        </div>

        {/* NEW CHALLENGE! Badge */}
        <div className="flex justify-end">
          <p
            className={`font-extrabold text-[10px] text-white ${textShadow}`}
          >
            NEW CHALLENGE!
          </p>
        </div>

        {/* O/U Line (if applicable) */}
        {bet.type === 'OVER_UNDER' && bet.line && (
          <div>
            <p
              className={`font-extrabold text-[8px] ${textShadow}`}
              style={{ color: themeColor }}
            >
              O/U Line: {bet.line}
            </p>
          </div>
        )}

        {/* Wager */}
        <div>
          <p className={`font-semibold text-[8px] ${textShadow}`}>
            <span className="text-white">Wager: {formatCurrency(wager)}</span>
          </p>
        </div>

        {/* Challenge Message */}
        <div className="bg-[#1C1917] rounded-lg p-3">
          <p className={`text-white text-[10px] text-center mb-2 ${textShadow}`}>
            You've been challenged by {challengerDisplayName || 'a friend'}!
          </p>
          <p className={`text-zinc-400 text-[8px] text-center ${textShadow}`}>
            Accept to join the bet or decline to pass
          </p>
        </div>

        {/* Accept/Decline Buttons */}
        <div className="flex gap-2">
          {/* Decline Button (Red) */}
          <button
            onClick={() => onDeclineChallenge?.(bet.id)}
            className={`
              flex-1 h-[40px] bg-[#c21717] rounded-[6px]
              text-white text-[14px] font-bold
              hover:bg-[#d41f1f] transition-colors
              shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]
              ${textShadow}
            `}
          >
            Decline
          </button>

          {/* Accept Button (Green) */}
          <button
            onClick={() => onAcceptChallenge?.(bet.id)}
            className={`
              flex-1 h-[40px] bg-[#0abf00] rounded-[6px]
              text-white text-[14px] font-bold
              hover:bg-[#0cd902] transition-colors
              shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]
              ${textShadow}
            `}
          >
            Accept
          </button>
        </div>
      </div>
    );
  }

  // === PENDING STATE (Creator waiting for acceptance) ===
  if (cardState === 'PENDING') {
    const themeColor = '#A855F7'; // Purple for H2H

    return (
      <div
        className="bg-[#18181B] rounded-[6px] p-3 space-y-2 border-2 opacity-75"
        style={{ borderColor: themeColor, fontFamily: "'Montserrat', sans-serif" }}
      >
        {/* Row 1: H2H Name (left) + Creator Name (right) */}
        <div className="flex items-center justify-between mb-1">
          <p
            className={`font-semibold text-[8px] ${textShadow}`}
            style={{ color: themeColor }}
          >
            {h2hChallengeDisplayName || 'Challenge Sent'}
          </p>

          <span className={`text-[8px] font-semibold text-[#58585a] ${textShadow}`}>
            Creator: You
          </span>
        </div>

        {/* Row 2: Bet Title (left) + Timer + Trash (right) */}
        <div className="flex items-center justify-between mb-1">
          {/* Left: Bet Title */}
          <p className={`font-semibold text-[12px] text-white ${textShadow} flex-1 mr-2`}>
            {bet.title}
          </p>

          {/* Right: Timer + Trash */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <p
              className={`font-semibold text-[8px] ${textShadow} whitespace-nowrap ${
                isUnderOneHour ? 'pulse-yellow' : ''
              }`}
              style={{ color: isUnderOneHour ? undefined : themeColor }}
            >
              Closes: {timeRemaining}
            </p>

            {isCreator && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-white hover:text-[#ef4444] transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* O/U Line (if applicable) */}
        {bet.type === 'OVER_UNDER' && bet.line && (
          <div>
            <p
              className={`font-extrabold text-[8px] ${textShadow}`}
              style={{ color: themeColor }}
            >
              O/U Line: {bet.line}
            </p>
          </div>
        )}

        {/* Wager */}
        <div>
          <p className={`font-semibold text-[8px] ${textShadow}`}>
            <span className="text-white">Wager: {formatCurrency(wager)}</span>
          </p>
        </div>

        {/* Pending Message */}
        <div className="bg-[#1C1917] rounded-lg p-3">
          <p className={`text-zinc-400 text-[10px] text-center ${textShadow}`}>
            ⏳ Waiting for {challengeeDisplayName || 'friend'} to accept...
          </p>
        </div>

        {/* Delete Modal for PENDING state */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#18181B] rounded-lg p-4 max-w-sm mx-4 border border-[#A855F7]">
              <h4 className={`text-white font-semibold mb-2 ${textShadow}`}>Cancel Challenge?</h4>
              <p className={`text-[#a1a1aa] text-sm mb-4 ${textShadow}`}>
                Are you sure you want to cancel this challenge? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`flex-1 py-2 bg-[#3f3f3f] text-white rounded-lg text-sm font-semibold ${textShadow}`}
                >
                  Keep
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`flex-1 py-2 bg-[#C21717] text-white rounded-lg text-sm font-semibold disabled:opacity-50 ${textShadow}`}
                >
                  {isDeleting ? "Canceling..." : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div
      className={`relative w-full max-w-[393px] ${getBgClass()} rounded-[6px] ${getPaddingClass()} ${getBorderClass()} flex flex-col gap-[4px]`}
      style={{ fontFamily: "'Montserrat', sans-serif", borderColor: getBorderColor() }}
    >
      {/* Row 1: Group/H2H Name (left) + Creator Name (right) */}
      <div className="flex items-center justify-between mb-1">
        {/* Left: Clickable Display Name (Group name or H2H names) */}
        <button
          onClick={handleDisplayNameClick}
          className={`text-[8px] font-semibold ${textShadow} flex-shrink-0 ${
            isH2H ? 'cursor-default' : 'cursor-pointer hover:underline hover:opacity-80'
          } transition-all`}
          style={{ color: themeColor }}
          disabled={isH2H}
        >
          {displayName}
        </button>

        {/* Right: Creator Name */}
        <span className={`text-[8px] font-semibold text-[#58585a] ${textShadow} flex-shrink-0`}>
          Creator: {isCreator ? 'You' : (creatorName || 'Loading...')}
        </span>
      </div>

      {/* Row 2: Bet Title (left) + Timer + Trash (right) */}
      <div className="flex items-center justify-between mb-1">
        {/* Left: Bet Title */}
        <p className={`text-[12px] font-semibold text-white leading-tight ${textShadow} flex-1 mr-2`}>
          {bet.title}
        </p>

        {/* Right: Timer + Trash */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Timer/Status Badge */}
          {renderStatusBadge()}

          {/* Trash Icon (only for creator on certain states) */}
          {isCreator && ['ACTIVE', 'PLACED', 'WAITING_JUDGEMENT'].includes(cardState) && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 text-white hover:text-[#C21717] transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* O/U Line for OVER_UNDER type */}
      {bet.type === "OVER_UNDER" && bet.line !== undefined && (
        <div className={`text-[8px] font-extrabold ${textShadow}`} style={{ color: themeColor }}>
          O/U Line: {bet.line}
        </div>
      )}

      {/* Won/Lost state - show closed info (creator is in header) */}
      {(cardState === "WON" || cardState === "LOST") && (
        <div className="flex flex-col gap-[4px]">
          <span className={`text-[8px] font-semibold text-[#58585A] ${textShadow}`}>
            Closed: {formatDate(bet.judgedAt || bet.closingAt)}
          </span>
        </div>
      )}

      {/* Wager info - different for won/lost */}
      {cardState !== "WON" && cardState !== "LOST" && (
        <div className={`text-[8px] font-semibold ${textShadow}`}>
          <span className="text-white">Wager: {formatCurrency(wager)} | </span>
          <span style={{ color: themeColor }}>Total Pot: {formatCurrency(pot)}</span>
        </div>
      )}

      {/* Players count */}
      <div className={`text-[8px] font-semibold text-white ${textShadow}`}>
        Players: {people}
      </div>

      {/* State-specific content */}
      {cardState === "ACTIVE" && renderVotingButtons()}
      {cardState === "PLACED" && renderPlacedContent()}
      {cardState === "JUDGE" && renderJudgeContent()}
      {cardState === "WAITING_JUDGEMENT" && renderWaitingContent()}
      {(cardState === "WON" || cardState === "LOST") && renderResultContent()}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181B] rounded-lg p-4 max-w-sm mx-4 border" style={{ borderColor: themeColor }}>
            <h4 className={`text-white font-semibold mb-2 ${textShadow}`}>Delete Bet?</h4>
            <p className={`text-[#a1a1aa] text-sm mb-4 ${textShadow}`}>
              Are you sure you want to delete this bet? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 py-2 bg-[#3f3f3f] text-white rounded-lg text-sm font-semibold ${textShadow}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex-1 py-2 bg-[#C21717] text-white rounded-lg text-sm font-semibold disabled:opacity-50 ${textShadow}`}
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
