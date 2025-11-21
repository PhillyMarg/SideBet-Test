// src/components/JudgeBetModal.tsx
"use client";

import { useState } from "react";
import { doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase/client";
import { createActivity } from "../lib/activityHelpers";
import { notifyBetResult } from "../lib/notifications";

interface JudgeBetModalProps {
  bet: any;
  onClose: () => void;
}

export default function JudgeBetModal({ bet, onClose }: JudgeBetModalProps) {
  const [correctAnswer, setCorrectAnswer] = useState<string | number>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJudge = async (answer: string | number) => {
    console.log('=== JUDGE BET DEBUG ===');
    console.log('Bet ID:', bet.id);
    console.log('Bet Type:', bet.type);
    console.log('Answer:', answer);
    console.log('Bet Line:', bet.line);
    console.log('Participants:', bet.participants);
    console.log('Picks:', bet.picks);

    setIsSubmitting(true);

    try {
      // Calculate winners based on bet type
      let winners: string[] = [];
      let correctValue = answer;
      let actualValue: number | undefined;
      let winningChoice: string | undefined;

      if (bet.type === "YES_NO") {
        // Winners are those who picked the correct answer
        winners = Object.entries(bet.picks || {})
          .filter(([_, pick]) => pick === answer)
          .map(([userId]) => userId);
      } else if (bet.type === "OVER_UNDER") {
        // For OVER_UNDER, answer is the actual numeric result
        actualValue = parseFloat(answer as string);

        if (isNaN(actualValue)) {
          alert("Please enter a valid number");
          setIsSubmitting(false);
          return;
        }

        // Check if result is exactly on the line (push)
        if (actualValue === bet.line) {
          alert("Result is exactly on the line. This is a push - all wagers will be returned.");

          // Mark bet as void/push - return all wagers
          const betRef = doc(db, "bets", bet.id);
          await updateDoc(betRef, {
            status: "VOID",
            correctAnswer: "PUSH",
            actualValue: actualValue,
            line: bet.line,
            winners: [],
            judgedAt: new Date().toISOString(),
            payoutPerWinner: 0,
            voidReason: "Result exactly on line"
          });

          onClose();
          setIsSubmitting(false);
          return;
        }

        // Determine if result is OVER or UNDER the line
        winningChoice = actualValue > bet.line ? "OVER" : "UNDER";
        correctValue = winningChoice;

        // Winners are those who picked the winning side
        winners = Object.entries(bet.picks || {})
          .filter(([_, pick]) => pick === winningChoice)
          .map(([userId]) => userId);

        // If no one picked correctly, void the bet
        if (winners.length === 0) {
          alert("No one picked correctly. The bet will be voided and all wagers returned.");

          const betRef = doc(db, "bets", bet.id);
          await updateDoc(betRef, {
            status: "VOID",
            correctAnswer: winningChoice,
            actualValue: actualValue,
            line: bet.line,
            winners: [],
            judgedAt: new Date().toISOString(),
            payoutPerWinner: 0,
            voidReason: "No correct picks"
          });

          onClose();
          setIsSubmitting(false);
          return;
        }
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
      const updateData: any = {
        status: "JUDGED",
        correctAnswer: correctValue,
        winners: winners,
        judgedAt: new Date().toISOString(),
        payoutPerWinner: payoutPerWinner,
      };

      // For OVER_UNDER bets, store additional result data
      if (bet.type === "OVER_UNDER" && actualValue !== undefined && winningChoice) {
        updateData.actualValue = actualValue;
        updateData.line = bet.line;
        updateData.winningChoice = winningChoice;
      }

      batch.update(betRef, updateData);

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

      // Send notifications to all participants
      for (const userId of bet.participants || []) {
        const isWinner = winners.includes(userId);
        await notifyBetResult(
          userId,
          bet.id,
          bet.title,
          isWinner,
          isWinner ? payoutPerWinner : undefined
        );
      }

      alert(
        `✅ Bet judged! ${winners.length} winner${
          winners.length !== 1 ? "s" : ""
        } - $${payoutPerWinner.toFixed(2)} each`
      );
      onClose();
    } catch (error: any) {
      console.error('=== JUDGE BET ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Bet ID:', bet.id);
      console.error('Answer:', answer);

      // More specific error message
      let errorMessage = "Failed to judge bet. Please try again.";
      if (error?.code === 'permission-denied') {
        errorMessage = "Permission denied. You may not have access to judge this bet.";
      } else if (error?.code === 'not-found') {
        errorMessage = "Bet not found. It may have been deleted.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      alert(errorMessage);
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

        {/* YES/NO */}
        {bet.type === "YES_NO" && (
          <div className="flex gap-3">
            {/* LEFT BUTTON - NO (Dark) */}
            <button
              onClick={() => handleJudge("NO")}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-zinc-800 border-2 border-orange-500 hover:bg-zinc-700 text-white transition disabled:opacity-50"
            >
              No
            </button>
            {/* RIGHT BUTTON - YES (Orange) */}
            <button
              onClick={() => handleJudge("YES")}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
            >
              Yes
            </button>
          </div>
        )}

        {/* OVER/UNDER - Quick Buttons or Enter Actual Result */}
        {bet.type === "OVER_UNDER" && (
          <div>
            {/* Show the line */}
            {bet.line !== undefined && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <p className="text-sm text-gray-400 mb-1">O/U Line:</p>
                <p className="text-2xl font-bold text-orange-500">{bet.line}</p>
              </div>
            )}

            {/* Quick UNDER/OVER buttons */}
            <p className="text-sm text-gray-400 mb-2 text-center">
              Pick the winning side:
            </p>
            <div className="flex gap-3 mb-4">
              {/* LEFT BUTTON - UNDER (Dark) */}
              <button
                onClick={() => {
                  // Use a value below the line to trigger UNDER
                  const underValue = bet.line - 1;
                  handleJudge(underValue.toString());
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg text-sm font-semibold bg-zinc-800 border-2 border-orange-500 hover:bg-zinc-700 text-white transition disabled:opacity-50"
              >
                Under
              </button>
              {/* RIGHT BUTTON - OVER (Orange) */}
              <button
                onClick={() => {
                  // Use a value above the line to trigger OVER
                  const overValue = bet.line + 1;
                  handleJudge(overValue.toString());
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
              >
                Over
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-zinc-700"></div>
              <span className="text-xs text-gray-500">or enter exact value</span>
              <div className="flex-1 h-px bg-zinc-700"></div>
            </div>

            <input
              type="number"
              step="0.5"
              placeholder={`Enter actual value (e.g., ${bet.line ? bet.line + 10 : '82'})`}
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 mb-4 text-center text-lg"
            />
            <button
              onClick={() => handleJudge(correctAnswer)}
              disabled={isSubmitting || !correctAnswer}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
            >
              Declare Winner
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