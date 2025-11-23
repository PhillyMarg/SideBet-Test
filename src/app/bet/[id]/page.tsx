"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Users, Clock, DollarSign, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function SharedBetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bet, setBet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedPick, setSelectedPick] = useState("");
  const [guessValue, setGuessValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load bet
  useEffect(() => {
    const loadBet = async () => {
      try {
        const betDoc = await getDoc(doc(db, "bets", params.id));
        if (betDoc.exists()) {
          setBet({ id: betDoc.id, ...betDoc.data() });
        } else {
          setError("Bet not found");
        }
      } catch (err) {
        console.error("Error loading bet:", err);
        setError("Failed to load bet");
      } finally {
        setLoading(false);
      }
    };

    loadBet();
  }, [params.id]);

  // Format closing time
  const getClosingTimeDisplay = () => {
    if (!bet?.closingAt) return "No close time";

    const now = Date.now();
    const closingTime = new Date(bet.closingAt).getTime();

    if (isNaN(closingTime)) return "No close time";
    if (closingTime <= now) return "CLOSED";

    const timeUntilClose = closingTime - now;
    const days = Math.floor(timeUntilClose / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeUntilClose % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      const minutes = Math.floor((timeUntilClose % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${minutes}m remaining`;
    } else {
      const minutes = Math.floor(timeUntilClose / (60 * 1000));
      return `${minutes}m remaining`;
    }
  };

  // Check if bet is closed
  const isClosed = bet?.closingAt && new Date(bet.closingAt).getTime() <= Date.now();

  // Check if user has already picked
  const userHasPicked = user && bet?.picks && bet.picks[user.uid] !== undefined;

  // Handle placing a bet
  const handlePlaceBet = async () => {
    if (!user || !bet) return;

    setIsSubmitting(true);

    try {
      const betRef = doc(db, "bets", bet.id);
      const pick = bet.type === "CLOSEST_GUESS" ? guessValue : selectedPick;

      if (!pick) {
        toast.error("Please make a selection");
        setIsSubmitting(false);
        return;
      }

      await updateDoc(betRef, {
        [`picks.${user.uid}`]: pick,
        participants: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      toast.success("Bet placed successfully!");
      setShowPickModal(false);

      // Refresh bet data
      const updatedBet = await getDoc(betRef);
      setBet({ id: updatedBet.id, ...updatedBet.data() });

    } catch (err: any) {
      console.error("Error placing bet:", err);
      toast.error(`Failed to place bet: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Error state
  if (error || !bet) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error === "Bet not found" ? "Bet Not Found" : "Error"}
          </h1>
          <p className="text-zinc-400 mb-6">
            {error === "Bet not found"
              ? "This bet may have been deleted or the link is invalid."
              : "There was an error loading this bet."}
          </p>
          <button
            onClick={() => router.push(user ? "/home" : "/login")}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
          >
            {user ? "Go to Home" : "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  const isH2H = bet.isH2H === true;
  const themeColor = isH2H ? "purple" : "orange";
  const wager = bet.perUserWager ?? bet.betAmount ?? 0;
  const participants = bet.participants?.length ?? 0;
  const pot = wager * participants;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(user ? "/home" : "/")}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Shared Bet</h1>
        </div>
      </div>

      <div className="pt-20 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Bet Card Preview */}
          <div className={`bg-zinc-900 border ${isH2H ? 'border-purple-500/50' : 'border-orange-500/50'} rounded-2xl p-6 mb-6`}>
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                isH2H
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
              }`}>
                {isH2H ? "Head-to-Head" : "Group Bet"}
              </span>
              {bet.status === "JUDGED" && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-700 text-zinc-300">
                  Completed
                </span>
              )}
              {isClosed && bet.status !== "JUDGED" && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                  Closed
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              {bet.title}
            </h2>

            {/* Description */}
            {bet.description && (
              <p className="text-zinc-400 mb-4">
                {bet.description}
              </p>
            )}

            {/* Over/Under Line */}
            {bet.type === "OVER_UNDER" && bet.line !== undefined && (
              <div className={`mb-4 p-3 rounded-lg ${isH2H ? 'bg-purple-500/10' : 'bg-orange-500/10'}`}>
                <p className={`text-sm font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                  Over/Under Line: {bet.line}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <DollarSign className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <p className="text-xs text-zinc-400">Wager</p>
                <p className="text-sm font-bold text-white">${wager.toFixed(2)}</p>
              </div>

              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <p className="text-xs text-zinc-400">Players</p>
                <p className="text-sm font-bold text-white">{participants}</p>
              </div>

              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <Trophy className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <p className="text-xs text-zinc-400">Pot</p>
                <p className={`text-sm font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                  ${pot.toFixed(2)}
                </p>
              </div>

              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <p className="text-xs text-zinc-400">Time</p>
                <p className="text-sm font-bold text-white">{getClosingTimeDisplay()}</p>
              </div>
            </div>

            {/* H2H Participants */}
            {isH2H && (
              <div className="bg-zinc-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-zinc-400 mb-2">Participants</p>
                <p className={`font-semibold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                  {bet.challengerName} vs {bet.challengeeName}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {user ? (
            // Logged in user
            <>
              {isClosed ? (
                <div className="bg-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-zinc-400">This bet has closed</p>
                  <button
                    onClick={() => router.push("/home")}
                    className="mt-4 px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                  >
                    View Active Bets
                  </button>
                </div>
              ) : userHasPicked ? (
                <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-xl p-4 text-center">
                  <p className="text-emerald-400 font-semibold mb-2">You're already in this bet!</p>
                  <p className="text-zinc-400 text-sm">
                    Your pick: <span className={`font-bold ${isH2H ? 'text-purple-400' : 'text-orange-400'}`}>
                      {bet.picks[user.uid]}
                    </span>
                  </p>
                  <button
                    onClick={() => router.push("/home")}
                    className="mt-4 px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                  >
                    View All Bets
                  </button>
                </div>
              ) : isH2H ? (
                <div className="bg-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-zinc-400">This is a private head-to-head bet</p>
                  <button
                    onClick={() => router.push("/home")}
                    className="mt-4 px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                  >
                    View Active Bets
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPickModal(true)}
                  className={`w-full py-4 ${
                    isH2H
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  } text-white rounded-xl font-bold text-lg transition-colors shadow-lg`}
                >
                  Place Your Bet
                </button>
              )}
            </>
          ) : (
            // Not logged in
            <div className="space-y-4">
              <button
                onClick={() => router.push(`/signup?redirect=/bet/${params.id}`)}
                className={`w-full py-4 ${
                  isH2H
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } text-white rounded-xl font-bold text-lg transition-colors shadow-lg`}
              >
                Sign Up to Join
              </button>

              <p className="text-center text-zinc-500 text-sm">
                Already have an account?{" "}
                <button
                  onClick={() => router.push(`/login?redirect=/bet/${params.id}`)}
                  className={`${isH2H ? 'text-purple-400 hover:text-purple-300' : 'text-orange-400 hover:text-orange-300'} font-semibold`}
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pick Modal */}
      {showPickModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPickModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Place Your Bet</h3>

            <p className="text-zinc-400 text-sm mb-4">{bet.title}</p>

            {bet.type === "CLOSEST_GUESS" ? (
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Enter your guess:</label>
                <input
                  type="text"
                  value={guessValue}
                  onChange={(e) => setGuessValue(e.target.value)}
                  placeholder="Enter a number..."
                  className={`w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none ${
                    isH2H ? 'focus:border-purple-500' : 'focus:border-orange-500'
                  }`}
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {bet.type === "YES_NO" ? (
                  <>
                    <button
                      onClick={() => setSelectedPick("YES")}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        selectedPick === "YES"
                          ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`font-semibold ${
                        selectedPick === "YES"
                          ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                          : 'text-white'
                      }`}>
                        YES
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedPick("NO")}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        selectedPick === "NO"
                          ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`font-semibold ${
                        selectedPick === "NO"
                          ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                          : 'text-white'
                      }`}>
                        NO
                      </span>
                    </button>
                  </>
                ) : bet.type === "OVER_UNDER" ? (
                  <>
                    <button
                      onClick={() => setSelectedPick("OVER")}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        selectedPick === "OVER"
                          ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`font-semibold ${
                        selectedPick === "OVER"
                          ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                          : 'text-white'
                      }`}>
                        OVER
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedPick("UNDER")}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        selectedPick === "UNDER"
                          ? `${isH2H ? 'border-purple-500 bg-purple-500/10' : 'border-orange-500 bg-orange-500/10'}`
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`font-semibold ${
                        selectedPick === "UNDER"
                          ? (isH2H ? 'text-purple-500' : 'text-orange-500')
                          : 'text-white'
                      }`}>
                        UNDER
                      </span>
                    </button>
                  </>
                ) : null}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPickModal(false)}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceBet}
                disabled={isSubmitting || (!selectedPick && !guessValue)}
                className={`flex-1 px-4 py-3 ${
                  isH2H
                    ? 'bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-800'
                    : 'bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800'
                } disabled:text-zinc-500 text-white rounded-lg font-semibold transition-colors`}
              >
                {isSubmitting ? "Placing..." : "Confirm Bet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
