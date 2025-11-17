"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { getLivePercentages } from "../utils/timeUtils";

interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPickMade?: () => void;
}

export default function ActiveBetCard({ bet, user, onPickMade }: ActiveBetCardProps) {
  const router = useRouter();
  const isH2H = bet.isH2H === true;

  // Calculate time until close
  const now = Date.now();
  const closingTime = new Date(bet.closingAt).getTime();
  const timeUntilClose = closingTime - now;
  const isUrgent = timeUntilClose > 0 && timeUntilClose <= 60 * 60 * 1000;

  // Check if user has made a pick
  const userHasPicked = bet.participants?.includes(user?.uid);
  const userPick = bet.picks?.[user?.uid];

  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const { yes, no } = getLivePercentages(bet);

  // Helper function to format closing time
  const getClosingTimeDisplay = () => {
    if (!bet.closingAt) return "No close time";

    const now = Date.now();
    const closingTime = new Date(bet.closingAt).getTime();

    if (isNaN(closingTime)) return "No close time";
    if (closingTime <= now) return "CLOSED";

    const timeUntilClose = closingTime - now;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (timeUntilClose > oneWeek) {
      const closingDate = new Date(bet.closingAt);
      const month = String(closingDate.getMonth() + 1).padStart(2, '0');
      const day = String(closingDate.getDate()).padStart(2, '0');
      const year = String(closingDate.getFullYear()).slice(-2);
      return `Closes ${month}/${day}/${year}`;
    }

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

  // Helper functions for H2H names
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

  // ==================== H2H BET CARD ====================
  if (isH2H) {
    return (
      <div
        onClick={() => router.push(`/bets/${bet.id}`)}
        className={`
          rounded-2xl p-4 cursor-pointer transition-all
          bg-purple-950/30 border border-purple-500/50 hover:border-purple-400
          ${isUrgent ? 'border-2 border-purple-500 glow-purple' : ''}
        `}
      >
        {/* Purple Pill with Names - Top Left */}
        <div className="mb-3">
          <div className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500 rounded-full">
            <p className="text-xs font-semibold text-purple-500">
              {getChallengerFirstLast()} v. {getChallengeeFirstLast()}
            </p>
          </div>

          {/* Status and Odds Badges */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
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

            {bet.h2hOdds && (
              <div className="bg-purple-500/20 border border-purple-500/40 rounded-full px-2 py-0.5">
                <span className="text-[10px] text-purple-400 font-medium">
                  {bet.h2hOdds.challenger}:{bet.h2hOdds.challengee}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bet Title */}
        <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
          {bet.title}
        </h3>

        {/* NO player count for H2H */}

        {/* Wager Display - PURPLE */}
        {userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
          <div className="mt-1">
            <p className="text-[9px] sm:hidden text-gray-400 mb-1">
              Pick: <span className="font-bold text-purple-400">{bet.picks[user.uid]}</span>
              {" • "}
              Payout: <span className="font-bold text-green-400">${getEstimatedPayoutAfterPick().toFixed(2)}</span>
            </p>

            <div className="hidden sm:block">
              <p className="text-xs text-gray-400 mb-2">
                Your Pick:{" "}
                <span className="font-bold text-purple-400">
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

            {/* Progress Bar - PURPLE */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden h-5 flex items-center relative">
              <div
                className="bg-purple-500 h-full flex items-center justify-start px-2 transition-all duration-500 min-w-0"
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

        {isH2H && !userHasPicked && bet.betAmount && (
          <div className="text-xs text-purple-400 font-semibold mb-2">
            ${bet.betAmount} wager
          </div>
        )}

        {bet.status === "OPEN" && (
          <div className="text-xs text-purple-400">
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
    );
  }

  // ==================== GROUP BET CARD (UNCHANGED) ====================
  // Keep EXACT current design for group bets
  return (
    <div
      onClick={() => router.push(`/bets/${bet.id}`)}
      className={`
        bg-zinc-900 rounded-2xl p-4 cursor-pointer transition-all
        ${isUrgent
          ? 'border-2 border-orange-500 glow-orange'
          : 'border border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      {/* Group bet header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-gray-400">Group Bet</span>
        </div>
        <span className="text-xs font-bold text-orange-500">
          {getClosingTimeDisplay()}
        </span>
      </div>

      {/* Bet Title */}
      <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
        {bet.title}
      </h3>

      {/* Description */}
      {bet.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {bet.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <span>Wager: ${wager.toFixed(2)}</span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {people}
        </span>
        <span className="font-semibold text-orange-400">
          Pot: ${pot.toFixed(2)}
        </span>
      </div>

      {/* User Pick Status */}
      {userHasPicked && (bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">
            Your Pick:{" "}
            <span className="font-bold text-orange-400">
              {bet.picks[user.uid]}
            </span>
          </p>

          {/* Progress Bar - ORANGE for Group */}
          <div className="bg-zinc-800 rounded-lg overflow-hidden h-5 flex items-center relative">
            <div
              className="bg-orange-500 h-full flex items-center justify-start px-2 transition-all duration-500 min-w-0"
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

      {bet.status === "CLOSED" && (
        <div className="text-xs text-amber-500 font-medium mt-2">
          Awaiting Results
        </div>
      )}

      {bet.status === "JUDGED" && (
        <div className={`text-xs font-medium mt-2 ${
          bet.winners?.includes(user?.uid) ? 'text-green-500' : 'text-zinc-500'
        }`}>
          {bet.winners?.includes(user?.uid) ? '✓ You Won!' : 'Completed'}
        </div>
      )}
    </div>
  );
}
