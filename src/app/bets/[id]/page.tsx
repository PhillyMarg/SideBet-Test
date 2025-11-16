"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
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
  const [showRejectModal, setShowRejectModal] = useState(false);

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

  // Check if bet should be auto-voided (closed and still pending)
  useEffect(() => {
    if (!bet || !bet.isH2H) return;

    const checkAutoVoid = async () => {
      const now = Date.now();
      const closingTime = new Date(bet.closingAt).getTime();

      if (bet.h2hStatus === "pending" && now > closingTime) {
        // Auto-void and delete
        try {
          await deleteDoc(doc(db, "bets", bet.id));
          alert("This bet was automatically voided (not responded to in time)");
          router.push("/home");
        } catch (error) {
          console.error("Error auto-voiding bet:", error);
        }
      }
    };

    checkAutoVoid();
  }, [bet, router]);

  // Check if user is challengee and bet is pending
  const isPendingChallenge =
    bet?.isH2H &&
    bet?.h2hStatus === "pending" &&
    bet?.challengeeId === user?.uid;

  // Accept H2H challenge
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

      // Notify challenger of acceptance
      await addDoc(collection(db, "notifications"), {
        userId: bet.challengerId,
        type: "h2h_challenge",
        title: "Challenge Accepted!",
        message: `${user.displayName || `${user.firstName} ${user.lastName}`} accepted your challenge: "${bet.title}"`,
        link: `/bets/${bet.id}`,
        betId: bet.id,
        betTitle: bet.title,
        read: false,
        createdAt: new Date().toISOString()
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

  // Reject H2H challenge
  const rejectH2HChallenge = async () => {
    if (!user || !bet?.isH2H || bet?.challengeeId !== user.uid) return;

    setIsSubmitting(true);

    try {
      // Delete the bet
      await deleteDoc(doc(db, "bets", bet.id));

      // Notify challenger of rejection
      await addDoc(collection(db, "notifications"), {
        userId: bet.challengerId,
        type: "h2h_challenge",
        title: "Challenge Declined",
        message: `${user.displayName || `${user.firstName} ${user.lastName}`} declined your challenge: "${bet.title}"`,
        read: false,
        createdAt: new Date().toISOString()
      });

      alert("Challenge declined");
      router.push("/home");

    } catch (error: any) {
      console.error("Error declining challenge:", error);
      alert(`Failed to decline challenge: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!bet) return null;

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
                onClick={() => setShowRejectModal(true)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Awaiting Response Status (for challenger) */}
        {bet.isH2H && bet.h2hStatus === "pending" && bet.challengerId === user?.uid && (
          <div className="mb-6">
            <button
              disabled
              className="w-full py-3 bg-purple-500/50 text-purple-300 rounded-lg font-semibold cursor-not-allowed"
            >
              Awaiting Response
            </button>
          </div>
        )}

        {/* Bet Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">{bet.title}</h1>
          {bet.description && (
            <p className="text-zinc-400 mt-2">{bet.description}</p>
          )}
        </div>

        {/* Bet Details */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <h2 className="text-white font-semibold mb-3">Bet Details</h2>

          <div className="space-y-2">
            {bet.isH2H ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Type:</span>
                  <span className="text-purple-500 font-semibold">Head-to-Head</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Challenger:</span>
                  <span className="text-white">{bet.challengerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Challengee:</span>
                  <span className="text-white">{bet.challengeeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Odds:</span>
                  <span className="text-white">{bet.h2hOdds?.challenger}:{bet.h2hOdds?.challengee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Wager:</span>
                  <span className="text-white">${bet.betAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Status:</span>
                  <span className={`font-semibold ${
                    bet.h2hStatus === "pending" ? "text-amber-500" :
                    bet.h2hStatus === "accepted" ? "text-green-500" :
                    "text-zinc-400"
                  }`}>
                    {bet.h2hStatus === "pending" ? "Pending" :
                     bet.h2hStatus === "accepted" ? "Active" :
                     bet.h2hStatus}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Type:</span>
                  <span className="text-orange-500 font-semibold">Group Bet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Participants:</span>
                  <span className="text-white">{bet.participants?.length || 0}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Closing:</span>
              <span className="text-white">
                {new Date(bet.closingAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Options */}
        {bet.options && (
          <div className="bg-zinc-900 rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Options</h2>
            <div className="space-y-2">
              {bet.options.map((option: string, index: number) => (
                <div key={index} className="p-3 bg-zinc-800 rounded-lg">
                  <span className="text-white">{option}</span>
                </div>
              ))}
            </div>
          </div>
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
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <span className={`font-semibold ${
                    selectedPick === option
                      ? 'text-purple-500'
                      : 'text-white'
                  }`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => acceptH2HChallenge(selectedPick)}
              disabled={!selectedPick || isSubmitting}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors"
            >
              {isSubmitting ? "Accepting..." : "Accept Challenge"}
            </button>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[61] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-3">
              Decline Challenge?
            </h3>

            <p className="text-zinc-400 text-sm mb-6">
              This will permanently delete the bet and notify{" "}
              <span className="text-white font-semibold">{bet.challengerName}</span>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={rejectH2HChallenge}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-zinc-800 text-white rounded-lg font-semibold transition-colors"
              >
                {isSubmitting ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
