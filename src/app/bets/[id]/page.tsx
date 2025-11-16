"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc, addDoc, collection } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { X, Check } from "lucide-react";

export default function BetDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bet, setBet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPick, setSelectedPick] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [judgeOutcome, setJudgeOutcome] = useState("");
  const [isJudging, setIsJudging] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load bet
  useEffect(() => {
    const loadBet = async () => {
      try {
        const betDoc = await getDoc(doc(db, "bets", params.id));
        if (betDoc.exists()) {
          setBet({ id: betDoc.id, ...betDoc.data() });
        } else {
          alert("Bet not found");
          router.push("/home");
        }
      } catch (error) {
        console.error("Error loading bet:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBet();
  }, [params.id, router]);

  // Check if user is challengee and bet is pending
  const isPendingChallenge =
    bet?.isH2H &&
    bet?.h2hStatus === "pending" &&
    bet?.challengeeId === user?.uid;

  // Check if user can judge
  const canJudge =
    bet?.status === "CLOSED" &&
    (
      (bet?.isH2H && bet?.challengerId === user?.uid) || // H2H: only challenger
      (!bet?.isH2H && bet?.creatorId === user?.uid)      // Regular: creator
    );

  // Accept H2H challenge (by making a pick)
  const acceptH2HChallenge = async (pick: string) => {
    if (!user || !bet?.isH2H || bet?.challengeeId !== user.uid) return;

    setIsSubmitting(true);

    try {
      const betRef = doc(db, "bets", bet.id);

      await updateDoc(betRef, {
        [`picks.${user.uid}`]: pick,
        participants: arrayUnion(user.uid),
        h2hStatus: "accepted",
        h2hAcceptedAt: new Date().toISOString()
      });

      alert("✅ Challenge accepted! You're in the bet.");

      // Refresh bet data
      const updatedBet = await getDoc(betRef);
      setBet({ id: updatedBet.id, ...updatedBet.data() });
      setShowPickModal(false);

    } catch (error: any) {
      console.error("Error accepting H2H challenge:", error);
      alert(`Failed to accept challenge: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Decline H2H challenge
  const declineH2HChallenge = async () => {
    if (!user || !bet?.isH2H || bet?.challengeeId !== user.uid) return;

    const confirmed = confirm(
      `Decline challenge from ${bet.challengerName}?\n\nThis will delete the bet.`
    );

    if (!confirmed) return;

    try {
      // Delete the bet entirely
      await deleteDoc(doc(db, "bets", bet.id));

      alert("Challenge declined");
      router.push("/home");

    } catch (error: any) {
      console.error("Error declining challenge:", error);
      alert(`Failed to decline challenge: ${error.message}`);
    }
  };

  // Judge H2H bet with odds calculation
  const judgeH2HBet = async () => {
    if (!user || !bet?.isH2H || bet?.challengerId !== user.uid || !judgeOutcome) return;

    const confirmed = confirm(
      `Judge this bet as: ${judgeOutcome}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsJudging(true);

    try {
      // Determine winner based on picks
      const challengerPick = bet.picks?.[bet.challengerId];
      const challengeePick = bet.picks?.[bet.challengeeId];

      let winnerId = null;
      let winAmount = 0;
      let winnerName = "";

      if (challengerPick === judgeOutcome) {
        // Challenger wins
        winnerId = bet.challengerId;
        winAmount = bet.betAmount * bet.h2hOdds.challengee;
        winnerName = bet.challengerName;
      } else if (challengeePick === judgeOutcome) {
        // Challengee wins
        winnerId = bet.challengeeId;
        winAmount = bet.betAmount * bet.h2hOdds.challenger;
        winnerName = bet.challengeeName;
      }
      // If neither picked the outcome, it's a push (no winner)

      // Update bet
      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        status: "JUDGED",
        outcome: judgeOutcome,
        winners: winnerId ? [winnerId] : [],
        judgedAt: new Date().toISOString()
      });

      // Create activity if bet was in a group and there's a winner
      if (winnerId && bet.groupId) {
        await addDoc(collection(db, "activities"), {
          groupId: bet.groupId,
          type: "bet_judged",
          userId: winnerId,
          userName: winnerName,
          betId: bet.id,
          betTitle: bet.title,
          winAmount: winAmount,
          timestamp: new Date().toISOString()
        });
      }

      if (winnerId) {
        alert(`✅ ${winnerId === user.uid ? "You" : winnerName} won $${winAmount}!`);
      } else {
        alert("✅ Bet judged as a push (no winner)");
      }

      // Refresh bet
      const updatedBet = await getDoc(betRef);
      setBet({ id: updatedBet.id, ...updatedBet.data() });
      setShowJudgeModal(false);

    } catch (error: any) {
      console.error("Error judging H2H bet:", error);
      alert(`Failed to judge bet: ${error.message}`);
    } finally {
      setIsJudging(false);
    }
  };

  // Regular bet judging (non-H2H)
  const judgeRegularBet = async () => {
    if (!user || !bet || !judgeOutcome) return;

    const confirmed = confirm(
      `Judge this bet as: ${judgeOutcome}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsJudging(true);

    try {
      // Determine winners
      const winners: string[] = [];
      Object.entries(bet.picks || {}).forEach(([userId, pick]) => {
        if (pick === judgeOutcome) {
          winners.push(userId);
        }
      });

      // Update bet
      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        status: "JUDGED",
        outcome: judgeOutcome,
        winners: winners,
        judgedAt: new Date().toISOString()
      });

      alert(`✅ Bet judged! ${winners.length} winner(s)`);

      // Refresh bet
      const updatedBet = await getDoc(betRef);
      setBet({ id: updatedBet.id, ...updatedBet.data() });
      setShowJudgeModal(false);

    } catch (error: any) {
      console.error("Error judging bet:", error);
      alert(`Failed to judge bet: ${error.message}`);
    } finally {
      setIsJudging(false);
    }
  };

  // Regular pick submission (non-H2H)
  const submitRegularPick = async (pick: string) => {
    if (!user || !bet) return;

    setIsSubmitting(true);

    try {
      const betRef = doc(db, "bets", bet.id);

      await updateDoc(betRef, {
        [`picks.${user.uid}`]: pick,
        participants: arrayUnion(user.uid)
      });

      alert("✅ Pick submitted!");

      const updatedBet = await getDoc(betRef);
      setBet({ id: updatedBet.id, ...updatedBet.data() });
      setShowPickModal(false);

    } catch (error: any) {
      console.error("Error submitting pick:", error);
      alert(`Failed to submit pick: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!bet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Pending H2H Challenge Banner */}
        {isPendingChallenge && (
          <div className="mb-6 p-4 bg-purple-500/10 border-2 border-purple-500 rounded-2xl">
            <h3 className="text-lg font-bold text-purple-500 mb-2">
              🎯 You've Been Challenged!
            </h3>

            <p className="text-white text-sm mb-3">
              <span className="font-semibold">{bet.challengerName}</span> has challenged you to a head-to-head bet
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Wager:</span>
                <span className="text-white font-semibold">${bet.betAmount * bet.h2hOdds.challengee}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Potential Win:</span>
                <span className="text-green-500 font-semibold">${bet.betAmount * bet.h2hOdds.challenger}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Odds:</span>
                <span className="text-white">{bet.h2hOdds.challenger}:{bet.h2hOdds.challengee}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPickModal(true)}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Accept Challenge
              </button>

              <button
                onClick={declineH2HChallenge}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Bet Details */}
        <div className={`bg-zinc-900 border ${bet.isH2H ? 'border-purple-500' : 'border-zinc-800'} rounded-2xl p-6`}>
          {/* H2H Header */}
          {bet.isH2H && (
            <div className="mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full">
                  <span className="text-xs font-semibold text-purple-500">HEAD-TO-HEAD</span>
                </div>
              </div>

              <p className="text-lg font-bold text-purple-500">
                {bet.challengerName} v {bet.challengeeName}
              </p>
            </div>
          )}

          {/* Bet Title */}
          <h1 className="text-2xl font-bold text-white mb-3">
            {bet.title}
          </h1>

          {/* Description */}
          {bet.description && (
            <p className="text-zinc-400 text-sm mb-4">
              {bet.description}
            </p>
          )}

          {/* Bet Type Info */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Type:</span>
              <span className="text-white capitalize">{bet.type?.replace('_', ' ')}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status:</span>
              <span className="text-white">{bet.status}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Closes:</span>
              <span className="text-white">
                {new Date(bet.closingAt).toLocaleString()}
              </span>
            </div>

            {bet.type === "OVER_UNDER" && bet.line !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Line:</span>
                <span className="text-white">{bet.line}</span>
              </div>
            )}
          </div>

          {/* Action Button for Non-Pending Users */}
          {!isPendingChallenge && bet.status === "OPEN" && !bet.participants?.includes(user?.uid) && (
            <button
              onClick={() => setShowPickModal(true)}
              className={`w-full py-3 ${bet.isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg font-semibold transition-colors`}
            >
              Make Your Pick
            </button>
          )}

          {/* Show current pick if already made */}
          {bet.participants?.includes(user?.uid) && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-500 font-semibold text-sm">
                ✓ Your pick: {bet.picks?.[user.uid]}
              </p>
            </div>
          )}

          {/* Judge Button */}
          {canJudge && (
            <button
              onClick={() => setShowJudgeModal(true)}
              className={`w-full py-3 mt-4 ${bet.isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg font-semibold transition-colors`}
            >
              Judge Bet
            </button>
          )}
        </div>

        {/* Pick Modal */}
        {showPickModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowPickModal(false)}
          >
            <div
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[61] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPickModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-semibold text-white mb-4">
                Make Your Pick
              </h3>

              <div className="space-y-2 mb-6">
                {bet.options?.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => setSelectedPick(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      selectedPick === option
                        ? `${bet.isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      selectedPick === option
                        ? `${bet.isH2H ? 'text-purple-500' : 'text-orange-500'}`
                        : 'text-white'
                    }`}>
                      {option}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => isPendingChallenge ? acceptH2HChallenge(selectedPick) : submitRegularPick(selectedPick)}
                disabled={!selectedPick || isSubmitting}
                className={`w-full py-3 ${bet.isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors`}
              >
                {isSubmitting ? "Submitting..." : isPendingChallenge ? "Accept Challenge" : "Submit Pick"}
              </button>
            </div>
          </div>
        )}

        {/* Judge Modal */}
        {showJudgeModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowJudgeModal(false)}
          >
            <div
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[61] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowJudgeModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-semibold text-white mb-4">
                Judge Bet
              </h3>

              <p className="text-sm text-zinc-400 mb-4">
                What was the outcome?
              </p>

              {/* Show picks if H2H */}
              {bet.isH2H && (
                <div className="mb-4 p-3 bg-zinc-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{bet.challengerName}:</span>
                    <span className="text-white font-semibold">{bet.picks?.[bet.challengerId] || "No pick"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{bet.challengeeName}:</span>
                    <span className="text-white font-semibold">{bet.picks?.[bet.challengeeId] || "No pick"}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-6">
                {bet.options?.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => setJudgeOutcome(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      judgeOutcome === option
                        ? `${bet.isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`font-semibold ${
                      judgeOutcome === option
                        ? `${bet.isH2H ? 'text-purple-500' : 'text-orange-500'}`
                        : 'text-white'
                    }`}>
                      {option}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={bet.isH2H ? judgeH2HBet : judgeRegularBet}
                disabled={!judgeOutcome || isJudging}
                className={`w-full py-3 ${bet.isH2H ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors`}
              >
                {isJudging ? "Judging..." : "Confirm Judgment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
