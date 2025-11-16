// src/components/JudgeBetModal.tsx
"use client";

import { useState } from "react";
import { doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase/client";
import { createActivity } from "../lib/activityHelpers";

interface JudgeBetModalProps {
  bet: any;
  onClose: () => void;
}

export default function JudgeBetModal({ bet, onClose }: JudgeBetModalProps) {
  const [correctAnswer, setCorrectAnswer] = useState<string | number>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJudge = async (answer: string | number) => {
    setIsSubmitting(true);

    try {
      // Calculate winners based on bet type
      let winners: string[] = [];
      let correctValue = answer;

      if (bet.type === "YES_NO" || bet.type === "OVER_UNDER") {
        // Winners are those who picked the correct answer
        winners = Object.entries(bet.picks || {})
          .filter(([_, pick]) => pick === answer)
          .map(([userId]) => userId);
      } else if (bet.type === "CLOSEST_GUESS") {
        // Find the closest guess(es)
        const actualNumber = parseFloat(answer as string);
        if (isNaN(actualNumber)) {
          alert("Please enter a valid number");
          setIsSubmitting(false);
          return;
        }

        const guesses = Object.entries(bet.picks || {}).map(([userId, guess]) => ({
          userId,
          guess: parseFloat(guess as string),
          diff: Math.abs(parseFloat(guess as string) - actualNumber),
        }));

        if (guesses.length === 0) {
          alert("No guesses to judge!");
          setIsSubmitting(false);
          return;
        }

        // Find minimum difference
        const minDiff = Math.min(...guesses.map((g) => g.diff));
        winners = guesses.filter((g) => g.diff === minDiff).map((g) => g.userId);
        correctValue = actualNumber;
      }

      // Calculate payout per winner
      const totalPot = bet.perUserWager * (bet.participants?.length || 0);
      const payoutPerWinner = winners.length > 0 ? totalPot / winners.length : 0;

      // Use batch to update multiple documents
      const batch = writeBatch(db);

      // Update bet document
      const betRef = doc(db, "bets", bet.id);
      batch.update(betRef, {
        status: "JUDGED",
        correctAnswer: correctValue,
        winners: winners,
        judgedAt: new Date().toISOString(),
        payoutPerWinner: payoutPerWinner,
      });

      // Update leaderboard for all participants
      for (const userId of bet.participants || []) {
        const isWinner = winners.includes(userId);
        const leaderboardRef = doc(db, "leaderboards", `${bet.groupId}_${userId}`);

        // Check if leaderboard entry exists
        const leaderboardSnap = await getDoc(leaderboardRef);

        if (leaderboardSnap.exists()) {
          const currentData = leaderboardSnap.data();
          batch.update(leaderboardRef, {
            balance:
              (currentData.balance || 0) +
              (isWinner ? payoutPerWinner : -bet.perUserWager),
            wins: (currentData.wins || 0) + (isWinner ? 1 : 0),
            losses: (currentData.losses || 0) + (isWinner ? 0 : 1),
            total_bets: (currentData.total_bets || 0) + 1,
          });
        } else {
          // Create new leaderboard entry
          batch.set(leaderboardRef, {
            user_id: userId,
            group_id: bet.groupId,
            balance: isWinner ? payoutPerWinner : -bet.perUserWager,
            wins: isWinner ? 1 : 0,
            losses: isWinner ? 0 : 1,
            total_bets: 1,
          });
        }
      }

      await batch.commit();

      // Create activity for each winner
      for (const winnerId of winners) {
        // Get winner's name from users collection
        const userDoc = await getDoc(doc(db, "users", winnerId));
        const userData = userDoc.data();
        const winnerName = userData?.displayName ||
                          `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                          userData?.email ||
                          "Unknown User";

        await createActivity({
          groupId: bet.groupId,
          type: "bet_judged",
          userId: winnerId,
          userName: winnerName,
          betId: bet.id,
          betTitle: bet.title,
          winAmount: payoutPerWinner
        });
      }

      alert(
        `✅ Bet judged! ${winners.length} winner${
          winners.length !== 1 ? "s" : ""
        } - $${payoutPerWinner.toFixed(2)} each`
      );
      onClose();
    } catch (error) {
      console.error("Error judging bet:", error);
      alert("Failed to judge bet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-[200] bg-black/70"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[95%] sm:max-w-md bg-zinc-900 border border-orange-500 rounded-2xl shadow-xl px-6 py-6"
      >
        <h3 className="text-xl font-bold mb-4 text-center text-white">
          Judge Bet
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-semibold text-white">Bet:</span> {bet.title}
          </p>
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-semibold text-white">Participants:</span>{" "}
            {bet.participants?.length || 0}
          </p>
          <p className="text-sm text-gray-300 mb-4">
            <span className="font-semibold text-white">Total Pot:</span> $
            {(bet.perUserWager * (bet.participants?.length || 0)).toFixed(2)}
          </p>
        </div>

        {/* YES/NO or OVER/UNDER */}
        {(bet.type === "YES_NO" || bet.type === "OVER_UNDER") && (
          <div className="flex gap-3">
            <button
              onClick={() =>
                handleJudge(bet.type === "YES_NO" ? "YES" : "OVER")
              }
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
            >
              {bet.type === "YES_NO" ? "Yes" : "Over"}
            </button>
            <button
              onClick={() => handleJudge(bet.type === "YES_NO" ? "NO" : "UNDER")}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-white hover:bg-gray-200 text-black transition disabled:opacity-50"
            >
              {bet.type === "YES_NO" ? "No" : "Under"}
            </button>
          </div>
        )}

        {/* CLOSEST GUESS */}
        {bet.type === "CLOSEST_GUESS" && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Enter the actual number:
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 42.5"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 mb-4"
            />
            <button
              onClick={() => handleJudge(correctAnswer)}
              disabled={isSubmitting || !correctAnswer}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
            >
              Submit Judgment
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}