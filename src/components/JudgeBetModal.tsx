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
    setIsSubmitting(true);

    try {
      const isH2H = bet.isH2H === true;

      // H2H BET JUDGING
      if (isH2H) {
        const challengerPick = bet.picks?.[bet.challengerId];
        const challengeePick = bet.picks?.[bet.challengeeId];

        if (!challengerPick || !challengeePick) {
          alert("Both participants must have picks to judge this bet");
          setIsSubmitting(false);
          return;
        }

        let winnerId: string | null = null;
        let loserId: string | null = null;

        if (bet.type === "YES_NO" || bet.type === "OVER_UNDER") {
          // Determine winner based on correct pick
          if (challengerPick === answer) {
            winnerId = bet.challengerId;
            loserId = bet.challengeeId;
          } else if (challengeePick === answer) {
            winnerId = bet.challengeeId;
            loserId = bet.challengerId;
          } else {
            // Neither picked correctly - void the bet
            const betRef = doc(db, "bets", bet.id);
            await updateDoc(betRef, {
              status: "VOID",
              h2hStatus: "VOID",
              voidReason: "No one picked correctly",
              voidedBy: bet.creatorId,
              voidedAt: new Date().toISOString()
            });
            alert("Bet voided: No one picked correctly. All wagers returned.");
            onClose();
            setIsSubmitting(false);
            return;
          }
        } else if (bet.type === "CLOSEST_GUESS") {
          const actualNumber = parseFloat(answer as string);
          if (isNaN(actualNumber)) {
            alert("Please enter a valid number");
            setIsSubmitting(false);
            return;
          }

          const challengerGuess = parseFloat(challengerPick as string);
          const challengeeGuess = parseFloat(challengeePick as string);

          const challengerDistance = Math.abs(actualNumber - challengerGuess);
          const challengeeDistance = Math.abs(actualNumber - challengeeGuess);

          if (challengerDistance < challengeeDistance) {
            winnerId = bet.challengerId;
            loserId = bet.challengeeId;
          } else if (challengeeDistance < challengerDistance) {
            winnerId = bet.challengeeId;
            loserId = bet.challengerId;
          } else {
            // Exact tie - void the bet
            const betRef = doc(db, "bets", bet.id);
            await updateDoc(betRef, {
              status: "VOID",
              h2hStatus: "VOID",
              voidReason: "Exact tie - both equally close",
              voidedBy: bet.creatorId,
              voidedAt: new Date().toISOString(),
              actualValue: actualNumber,
              challengerDistance: challengerDistance,
              challengeeDistance: challengeeDistance
            });
            alert("Bet voided: Exact tie - both equally close. All wagers returned.");
            onClose();
            setIsSubmitting(false);
            return;
          }

          // Update bet with closest guess results
          const totalPot = (bet.betAmount || 0) * 2; // Both participants' stakes
          const betRef = doc(db, "bets", bet.id);
          await updateDoc(betRef, {
            status: "JUDGED",
            h2hStatus: "JUDGED",
            actualValue: actualNumber,
            challengerDistance: challengerDistance,
            challengeeDistance: challengeeDistance,
            winnerId: winnerId,
            loserId: loserId,
            winnerPayout: totalPot,
            judgedAt: new Date().toISOString()
          });

          // Send notifications
          if (winnerId) {
            await notifyBetResult(winnerId, bet.id, bet.title, true, totalPot);
          }
          if (loserId) {
            await notifyBetResult(loserId, bet.id, bet.title, false, undefined);
          }

          alert(`✅ H2H Bet judged! Winner receives $${totalPot.toFixed(2)}`);
          onClose();
          setIsSubmitting(false);
          return;
        }

        // For YES/NO and OVER/UNDER H2H bets
        const totalPot = (bet.betAmount || 0) * 2;
        const betRef = doc(db, "bets", bet.id);
        await updateDoc(betRef, {
          status: "JUDGED",
          h2hStatus: "JUDGED",
          winningChoice: answer,
          winnerId: winnerId,
          loserId: loserId,
          winnerPayout: totalPot,
          judgedAt: new Date().toISOString()
        });

        // Send notifications
        if (winnerId) {
          await notifyBetResult(winnerId, bet.id, bet.title, true, totalPot);
        }
        if (loserId) {
          await notifyBetResult(loserId, bet.id, bet.title, false, undefined);
        }

        alert(`✅ H2H Bet judged! Winner receives $${totalPot.toFixed(2)}`);
        onClose();
        setIsSubmitting(false);
        return;
      }

      // GROUP BET JUDGING (existing logic)
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
    } catch (error) {
      console.error("Error judging bet:", error);
      alert("Failed to judge bet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isH2H = bet.isH2H === true;
  const challengerPick = bet.picks?.[bet.challengerId];
  const challengeePick = bet.picks?.[bet.challengeeId];
  const borderColor = isH2H ? "border-purple-500" : "border-orange-500";
  const primaryColor = isH2H ? "purple" : "orange";

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-[200] bg-black/70"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[95%] sm:max-w-md bg-zinc-900 border-2 ${borderColor} rounded-2xl shadow-xl px-6 py-6`}
      >
        <h3 className="text-xl font-bold mb-4 text-center text-white">
          Judge Bet
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-semibold text-white">Bet:</span> {bet.title}
          </p>

          {isH2H ? (
            <>
              {/* H2H Picks Summary */}
              <div className="bg-zinc-800 rounded-lg p-3 mb-3 border border-purple-500/30">
                <p className="text-xs text-purple-400 font-semibold mb-2">Participants & Picks:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{bet.challengerName}</span>
                    <span className="text-sm font-bold text-purple-400">{challengerPick}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{bet.challengeeName}</span>
                    <span className="text-sm font-bold text-purple-400">{challengeePick}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                <span className="font-semibold text-white">Pot:</span> $
                {((bet.betAmount || 0) * 2).toFixed(2)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300 mb-2">
                <span className="font-semibold text-white">Participants:</span>{" "}
                {bet.participants?.length || 0}
              </p>
              <p className="text-sm text-gray-300 mb-4">
                <span className="font-semibold text-white">Total Pot:</span> $
                {(bet.perUserWager * (bet.participants?.length || 0)).toFixed(2)}
              </p>
            </>
          )}
        </div>

        {/* YES/NO */}
        {bet.type === "YES_NO" && (
          <div className="flex gap-3">
            <button
              onClick={() => handleJudge("YES")}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-white hover:bg-gray-200 text-black transition disabled:opacity-50"
            >
              Yes
            </button>
            <button
              onClick={() => handleJudge("NO")}
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 ${
                isH2H
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              No
            </button>
          </div>
        )}

        {/* OVER/UNDER - Enter Actual Result */}
        {bet.type === "OVER_UNDER" && (
          <div>
            {/* Show the line */}
            {bet.line !== undefined && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <p className="text-sm text-gray-400 mb-1">O/U Line:</p>
                <p className="text-2xl font-bold text-orange-500">{bet.line}</p>
              </div>
            )}

            <label className="block text-sm text-gray-400 mb-2">
              What was the actual result?
            </label>
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
              className={`w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:outline-none mb-4 ${
                isH2H ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
            <button
              onClick={() => handleJudge(correctAnswer)}
              disabled={isSubmitting || !correctAnswer}
              className={`w-full py-3 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 ${
                isH2H
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
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