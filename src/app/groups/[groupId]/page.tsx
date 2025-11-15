"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../../lib/firebase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  getDoc,
  addDoc,
  limit,
} from "firebase/firestore";
import JudgeBetModal from "../../../components/JudgeBetModal";
import ActiveBetCard from "../../../components/ActiveBetCard";
import ArchivedBetCard from "../../../components/ArchivedBetCard";
import FloatingCreateBetButton from "../../../components/FloatingCreateBetButton";
import Footer from "../../../components/Footer";
import { getTimeRemaining } from "../../../utils/timeUtils";
import { toast } from "sonner";

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("Loading...");
  const [judgingBet, setJudgingBet] = useState<any>(null);
  const [, forceUpdate] = useState(0);

  // 🎯 Handle user pick
  const handleUserPick = async (bet: any, pick: string | number) => {
    if (!user) return;

    const uid = user.uid;
    const updatedPicks = { ...bet.picks, [uid]: pick };
    const updatedParticipants = Array.from(
      new Set([...(bet.participants || []), uid])
    );

    try {
      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        picks: updatedPicks,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      setBets((prev) =>
        prev.map((b) =>
          b.id === bet.id
            ? { ...b, picks: updatedPicks, participants: updatedParticipants }
            : b
        )
      );
    } catch (err) {
      console.error("Error updating bet pick:", err);
      toast.error("Failed to place bet. Please try again.");
    }
  };

  // Create Bet Handler
  const handleCreateBet = async (betData: any) => {
    if (betData.type === "OVER_UNDER" && !betData.line) {
      toast.error("Please set a valid line ending in .5 for Over/Under bets.");
      return;
    }

    if (!user || !betData.title.trim() || !betData.groupId || !betData.wager) {
      toast.error("Please complete all required fields.");
      return;
    }

    const betDoc = {
      title: betData.title,
      description: betData.description || "",
      type: betData.type,
      status: "OPEN",
      line: betData.line || null,
      perUserWager: parseFloat(betData.wager),
      participants: [],
      picks: {},
      creatorId: user.uid,
      groupId: betData.groupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closingAt: betData.closingAt,
    };

    try {
      await addDoc(collection(db, "bets"), betDoc);
      toast.success("Bet created successfully!");
    } catch (err) {
      console.error("Error creating bet:", err);
      toast.error("Failed to create bet. Please try again.");
    }
  };

  // ⏱️ Countdown force re-render (only if there are active bets with countdowns)
  useEffect(() => {
    const activeBets = bets.filter((bet) => bet.status !== "JUDGED");
    const hasActiveCountdowns = activeBets.some(
      (bet) => !getTimeRemaining(bet.closingAt).isClosed
    );

    if (!hasActiveCountdowns) return; // Don't update if no active countdowns

    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [bets]);

  // 👤 Fetch creator name
  useEffect(() => {
    if (!group?.admin_id) return;

    const fetchCreatorName = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", group.admin_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const firstName = userData.firstName || "";
          const lastName = userData.lastName || "";
          setCreatorName(`${firstName} ${lastName}`.trim() || group.admin_id);
        } else {
          setCreatorName(group.admin_id);
        }
      } catch (error) {
        console.error("Error fetching creator name:", error);
        setCreatorName(group.admin_id);
      }
    };

    fetchCreatorName();
  }, [group?.admin_id]);

  // 👤 Auth + Firestore listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      // Fetch user's groups for bet creation
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", firebaseUser.uid),
        limit(50)
      );
      const unsubGroups = onSnapshot(groupsQuery, (snap) => {
        const groupsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
      });

      // Group info
      const groupRef = doc(db, "groups", groupId as string);
      const unsubGroup = onSnapshot(groupRef, (snap) => {
        if (snap.exists()) setGroup({ id: snap.id, ...snap.data() });
      });

      // Bets in this group
      const betsQuery = query(
        collection(db, "bets"),
        where("groupId", "==", groupId),
        limit(100)
      );
      const unsubBets = onSnapshot(betsQuery, (snap) => {
        const betData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets(betData);
      });

      // Leaderboard
      const leaderboardRef = collection(db, "leaderboards");
      const leaderboardQuery = query(
        leaderboardRef,
        where("group_id", "==", groupId),
        orderBy("balance", "desc"),
        limit(50)
      );
      const unsubLeaderboard = onSnapshot(leaderboardQuery, (snap) => {
        const leaders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLeaderboard(leaders);
      });

      setLoading(false);

      return () => {
        unsubGroup();
        unsubBets();
        unsubLeaderboard();
        unsubGroups();
      };
    });

    return () => unsubAuth();
  }, [groupId, router]);

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </main>
    );

  if (!group)
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Group not found.
      </main>
    );

  if (!user) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Authenticating...
      </main>
    );
  }

  const seasonEnabled = group.settings?.season_enabled;
  const seasonEnd = group.settings?.season_end_date;
  
  const activeBets = bets.filter((b) => b.status !== "JUDGED");
  const archivedBets = bets.filter((b) => b.status === "JUDGED");

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pb-20 relative overflow-y-auto">
      <div className="w-full max-w-2xl px-4">
        {/* 🧩 GROUP INFO */}
        <section className="w-full mt-6 px-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>

              {group.tagline && (
                <p className="text-sm text-gray-400 mt-1">{group.tagline}</p>
              )}

              <p className="text-sm text-gray-500 mt-2">
                <span className="font-semibold text-gray-300">Members:</span>{" "}
                {group.memberIds?.length || 0}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-gray-300">Invite Code:</span>{" "}
                <span className="text-orange-400 font-medium">
                  {group.accessCode || "N/A"}
                </span>
              </p>

              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-gray-300">Group Creator:</span>{" "}
                <span className="text-orange-400 font-medium">
                  {creatorName}
                </span>
              </p>

              {seasonEnabled && seasonEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-gray-300">Season Ends In:</span>{" "}
                  <span className="text-orange-400 font-medium">
                    {seasonEnd}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

       {/* 🔶 USER STATS BAR */}
        <section className="bg-zinc-900 border-2 border-orange-500/80 rounded-2xl p-5 shadow-lg mt-6">
          <h2 className="text-xl font-bold mb-1 text-left text-white">Your Stats</h2>

          {(() => {
            const userStats = leaderboard.find((l) => l.user_id === user?.uid);
            
            if (!userStats) {
              return (
                <p className="text-sm text-gray-400">
                  No stats yet. Place your first bet to get started!
                </p>
              );
            }

            const balance = userStats.balance || 0;
            const wins = userStats.wins || 0;
            const losses = userStats.losses || 0;
            const ties = userStats.ties || 0;
            const totalGames = wins + losses + ties;
            const winPercentage = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
            const currentStreak = userStats.current_streak || 0;
            const streakType = userStats.streak_type || "W";

            return (
              <>
                <p
                  className={`text-sm mb-4 ${
                    balance >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  Total Balance: {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold">
                  <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 mb-1">Record</p>
                    <p className="text-lg font-bold text-white">
                      {wins}-{losses}-{ties}
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 mb-1">Win %</p>
                    <p className="text-lg font-bold text-white">{winPercentage}%</p>
                  </div>

                  <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 mb-1">Current Streak</p>
                    <p
                      className={`text-lg font-bold ${
                        streakType === "W" && currentStreak > 0
                          ? "text-green-400"
                          : streakType === "L" && currentStreak > 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {currentStreak > 0 ? `${currentStreak}${streakType}` : "-"}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        {/* 🎯 ACTIVE BETS */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3 text-white text-left">
            Active Bets
          </h2>

          {activeBets.length > 0 ? (
            <ul className="space-y-4 w-full">
              {activeBets.map((bet: any) => (
                <ActiveBetCard
                  key={bet.id}
                  bet={bet}
                  user={user}
                  onPick={handleUserPick}
                  onJudge={setJudgingBet}
                />
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm text-center">No active bets.</p>
          )}
        </section>

        {/* 🏆 LEADERBOARD */}
        <section className="mt-8">
          <div className="flex justify-between w-full items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-orange-400 text-sm font-medium hover:text-orange-300 transition"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              >
                {leaderboard.length > 0 ? (
                  leaderboard.map((leaderUser, i) => (
                    <motion.div
                      key={leaderUser.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 mb-2 last:border-none last:mb-0"
                    >
                      <span className="font-medium text-white">
                        #{i + 1} {leaderUser.user_id?.substring(0, 8)}
                      </span>
                      <div className="flex gap-5 text-right">
                        <span
                          className={`font-semibold ${
                            leaderUser.balance >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          ${leaderUser.balance?.toFixed(2) || "0.00"}
                        </span>
                        <span className="text-gray-300">
                          {leaderUser.wins || 0}-{leaderUser.losses || 0}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center">
                    No leaderboard data yet.
                  </p>
                )}

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-orange-400 text-sm font-medium hover:text-orange-300 transition"
                  >
                    Show Less
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 🗂️ ARCHIVED BETS */}
        <section className="mt-8">
          <div className="flex justify-between w-full items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Archived Bets</h3>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-orange-400 text-sm font-medium hover:text-orange-300 transition"
            >
              {showArchived ? "Hide" : "Show"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2"
              >
                {archivedBets.length > 0 ? (
                  archivedBets
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.closingAt).getTime() -
                        new Date(a.closingAt).getTime()
                    )
                    .map((bet: any) => (
                      <ArchivedBetCard key={bet.id} bet={bet} user={user} />
                    ))
                ) : (
                  <p className="text-gray-500 text-sm text-center">
                    No archived bets.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Judge Bet Modal */}
      {judgingBet && (
        <JudgeBetModal
          bet={judgingBet}
          onClose={() => setJudgingBet(null)}
        />
      )}

      <Footer />

      {/* Floating Create Bet Button */}
      <FloatingCreateBetButton
        groups={groups}
        onCreateBet={handleCreateBet}
      />
    </main>
  );
}