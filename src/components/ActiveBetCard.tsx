"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTimeRemaining, getLivePercentages } from "../utils/timeUtils";

interface ActiveBetCardProps {
  bet: any;
  user: any;
  onPick: (bet: any, pick: string | number) => Promise<void>;
  onJudge: (bet: any) => void;
  groupName?: string;
}

export default function ActiveBetCard({
  bet,
  user,
  onPick,
  onJudge,
  groupName,
}: ActiveBetCardProps) {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);

  const { text: countdownText, isClosed } = getTimeRemaining(bet.closingAt);
  const wager = bet.perUserWager ?? 0;
  const people = bet.participants?.length ?? 0;
  const pot = wager * people;
  const userHasPicked = bet.picks && bet.picks[user?.uid] !== undefined;
  const { yes, no } = getLivePercentages(bet);
  const isCreator = bet.creatorId === user?.uid;
  const needsJudging = isClosed && bet.status !== "JUDGED" && isCreator;

  const calculateEstimatedPayout = (side: "yes" | "no") => {
    if (people === 0) return wager;
    
    const yesVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "YES" || v === "OVER"
    ).length;
    const noVotes = people - yesVotes;

    if (side === "yes") {
      const potentialWinners = yesVotes + 1;
      return pot / potentialWinners + wager;
    } else {
      const potentialWinners = noVotes + 1;
      return pot / potentialWinners + wager;
    }
  };

  const getEstimatedPayoutAfterPick = () => {
    if (bet.type === "CLOSEST_GUESS") {
      return pot + wager;
    }

    const userPick = bet.picks[user?.uid];
    const yesVotes = Object.values(bet.picks || {}).filter(
      (v) => v === "YES" || v === "OVER"
    ).length;
    const noVotes = people - yesVotes;

    if (userPick === "YES" || userPick === "OVER") {
      return yesVotes > 0 ? (pot + wager * yesVotes) / yesVotes : pot + wager;
    } else {
      return noVotes > 0 ? (pot + wager * noVotes) / noVotes : pot + wager;
    }
  };

  return (
    <li
      className={`rounded-2xl px-4 py-3 flex flex-col text-left shadow-md hover:scale-[1.02] transition-transform duration-200 text-sm sm:text-base w-full ${
        needsJudging
          ? "bg-orange-500/10 border-2 border-orange-500/50 hover:border-orange-500"
          : "bg-zinc-900 border border-zinc-800 hover:border-orange-500"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {groupName && (
            <button
              onClick={() => router.push(`/groups/${bet.groupId}`)}
              className="text-xs font-medium border border-orange-500 text-orange-400 rounded-full px-2 py-[2px] hover:bg-orange-500 hover:text-white transition"
            >
              {groupName}
            </button>
          )}
          <span className="text-xs text-gray-400">
            by {bet.creatorId?.substring(0, 8)}
          </span>
        </div>
        <span className="text-xs font-bold text-orange-500">{countdownText}</span>
      </div>

      <p className="font-semibold text-white mb-1 text-sm sm:text-base">
        {bet.title}
      </p>
      {bet.description && (
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">{bet.description}</p>
      )}

      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <span>Wager: ${wager.toFixed(2)}</span>
        <span>People: {people}</span>
        <span>Total Pot: ${pot.toFixed(2)}</span>
      </div>

      {needsJudging && (
        <button
          onClick={() => onJudge(bet)}
          className="w-full py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white mb-3 shadow-lg transition"
        >
          ⚖️ Judge This Bet
        </button>
      )}

      {!isClosed && (
        <>
          {userHasPicked ? (
            <>
              {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-2">
                    Your Pick:{" "}
                    <span className="font-bold text-orange-400">
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

                  <div className="bg-zinc-800 rounded-lg overflow-hidden h-6 flex items-center relative">
                    <div
                      className="bg-orange-500 h-full flex items-center justify-start px-2 transition-all duration-500"
                      style={{ width: `${yes}%` }}
                    >
                      <span className="text-white text-xs font-bold">
                        {bet.type === "YES_NO" ? "Yes" : "Over"}{" "}
                        <span className="text-[10px] font-normal">{yes}%</span>
                      </span>
                    </div>

                    <div
                      className="bg-white h-full flex items-center justify-end px-2 transition-all duration-500"
                      style={{ width: `${no}%` }}
                    >
                      <span className="text-black text-xs font-bold">
                        {bet.type === "YES_NO" ? "No" : "Under"}{" "}
                        <span className="text-[10px] font-normal">{no}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : bet.type === "CLOSEST_GUESS" ? (
                <div className="mt-2 flex flex-col items-center">
                  <p className="text-xs text-gray-400 mb-1">
                    Your Guess:{" "}
                    <span className="font-bold text-orange-400">
                      {bet.picks[user.uid]}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Estimated Payout:{" "}
                    <span className="font-bold text-green-400">
                      ${(pot + wager).toFixed(2)}
                    </span>{" "}
                    if you win
                  </p>

                  <button
                    onClick={() => setShowResults(!showResults)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                  >
                    {showResults ? "Hide Results" : "View Results"}
                  </button>

                  {showResults && (
                    <div className="w-full mt-3 bg-zinc-800 rounded-lg p-3 transition-all duration-300">
                      <p className="text-sm font-semibold text-white mb-2">
                        All Guesses:
                      </p>
                      {bet.picks && Object.keys(bet.picks).length > 0 ? (
                        <ul className="space-y-1 text-sm text-gray-300">
                          {Object.entries(bet.picks)
                            .sort(([, a]: any, [, b]: any) => a - b)
                            .map(([userId, guess]: any) => (
                              <li key={userId} className="flex justify-between">
                                <span
                                  className={
                                    userId === user.uid
                                      ? "text-orange-400 font-semibold"
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
                        <p className="text-xs text-gray-500">No guesses yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {bet.type === "YES_NO" || bet.type === "OVER_UNDER" ? (
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={() =>
                      onPick(bet, bet.type === "YES_NO" ? "YES" : "OVER")
                    }
                    className="flex-1 py-3 rounded-lg text-sm font-semibold flex flex-col items-center justify-center shadow transition-all bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <span>{bet.type === "YES_NO" ? "Yes" : "Over"}</span>
                    <span className="text-xs text-white/80 mt-1">
                      Win ${calculateEstimatedPayout("yes").toFixed(2)}
                    </span>
                    <span className="text-[10px] text-white/60">{yes}% picked</span>
                  </button>
                  <button
                    onClick={() =>
                      onPick(bet, bet.type === "YES_NO" ? "NO" : "UNDER")
                    }
                    className="flex-1 py-3 rounded-lg text-sm font-semibold flex flex-col items-center justify-center shadow transition-all bg-white hover:bg-gray-200 text-black"
                  >
                    <span>{bet.type === "YES_NO" ? "No" : "Under"}</span>
                    <span className="text-xs text-gray-600 mt-1">
                      Win ${calculateEstimatedPayout("no").toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500">{no}% picked</span>
                  </button>
                </div>
              ) : bet.type === "CLOSEST_GUESS" ? (
                <div className="flex items-center gap-2 mt-auto">
                  <input
                    type="number"
                    placeholder="Enter your guess..."
                    id={`guess-${bet.id}`}
                    className="flex-1 bg-zinc-800 text-white text-sm p-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 transition"
                  />
                  <button
                    onClick={() => {
                      const value = (
                        document.getElementById(`guess-${bet.id}`) as HTMLInputElement
                      )?.value;
                      if (!value) return alert("Please enter a number.");
                      onPick(bet, parseFloat(value));
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow transition-all"
                  >
                    Submit
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </li>
  );
}