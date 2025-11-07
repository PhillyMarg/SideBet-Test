"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { db, auth } from "../../../lib/firebase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { getTimeRemaining, getLivePercentages } from "../../../utils/timeUtils";
import HeaderActions from "../../home/HeaderActions";

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  // 👇 add below your other useState hooks
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [isRegistering, setIsRegistering] = useState(false);
// ✉️ Email/password auth
const handleAuth = async () => {
  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error: any) {
    console.error("Auth error:", error);
    alert(error.message || "Authentication failed.");
  }
};

  const [, forceUpdate] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  // ⏱️ Countdown force re-render
  useEffect(() => {
    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 👤 Auth + Firestore listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      // Group info
      const groupRef = doc(db, "groups", groupId as string);
      const unsubGroup = onSnapshot(groupRef, (snap) => {
        if (snap.exists()) setGroup({ id: snap.id, ...snap.data() });
      });

      // Bets in this group
      const betsQuery = query(collection(db, "bets"), where("groupId", "==", groupId));
      const unsubBets = onSnapshot(betsQuery, (snap) => {
        const betData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets(betData);
      });

      // Leaderboard (optional, can calculate locally)
      const leaderboardRef = collection(db, "leaderboards");
      const leaderboardQuery = query(
        leaderboardRef,
        where("group_id", "==", groupId),
        orderBy("balance", "desc")
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
      };
    });

    return () => unsubAuth();
  }, [groupId]);

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

  const seasonEnabled = group.settings?.season_enabled;
  const seasonEnd = group.settings?.season_end_date;
  const countdown = seasonEnd ? getTimeRemaining(seasonEnd) : null;
  const activeBets = bets.filter((b) => !getTimeRemaining(b.closingAt).isClosed);
  const archivedBets = bets.filter((b) => getTimeRemaining(b.closingAt).isClosed);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pb-20 relative overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-2xl border-b border-gray-800 bg-transparent flex items-center justify-center p-4">
        <HeaderActions
          onCreateBet={() => router.push("/home")}
          onCreateGroup={() => router.push("/home")}
          onJoinGroup={() => router.push("/home")}
        />
      </div>

      {/* Floating Logout Button (right side, mobile-friendly) */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md z-50 transition-all"
      >
        Logout
      </button>

      {/* Wrapper for all content */}
      <div className="w-full max-w-2xl px-4">
        {/* 🧩 GROUP INFO */}
        <section className="w-full mt-6 px-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            {/* LEFT SIDE — Group Details */}
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
              {/* Group Creator */}
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-gray-300">Group Creator:</span>{" "}
                <span className="text-orange-400 font-medium">
                  {group.admin_id || "Unknown"}
                </span>
              </p>
              {/* Season Ends */}
              {seasonEnabled && seasonEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-gray-300">Season Ends In:</span>{" "}
                  <span className="text-orange-400 font-medium">
                    {countdown?.text === "CLOSED" ? "Ended" : countdown?.text}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 🔶 USER STATS BAR */}
        <section className="bg-zinc-900 border-2 border-orange-500/80 rounded-2xl p-5 shadow-lg mt-6">
          <h2 className="text-xl font-bold mb-1 text-left text-white">Your Stats</h2>
          {/* Total Balance */}
          <p
            className={`text-sm mb-4 ${
              104.25 >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            Total Balance: {104.25 >= 0 ? "+" : "-"}${Math.abs(104.25).toFixed(2)}
          </p>
          <div className="grid grid-cols-3 gap-3 text-center text-sm font-semibold">
            {/* Record */}
            <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
              <p className="text-xs text-gray-400 mb-1">Record</p>
              <p className="text-lg font-bold text-white">12-8-1</p>
            </div>
            {/* Win % */}
            <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
              <p className="text-xs text-gray-400 mb-1">Win %</p>
              <p className="text-lg font-bold text-white">60%</p>
            </div>
            {/* Current Streak */}
            <div className="bg-zinc-800 rounded-xl py-3 flex flex-col justify-center">
              <p className="text-xs text-gray-400 mb-1">Current Streak</p>
              <p
                className={`text-lg font-bold ${
                  true ? "text-green-400" : "text-red-400"
                }`}
              >
                3W
              </p>
            </div>
          </div>
        </section>

        {/* 🎯 ACTIVE BETS */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3 text-white text-left">Active Bets</h2>
          {activeBets.length > 0 ? (
            <ul className="space-y-4 w-full">
              {activeBets.map((bet) => {
                const { text: countdownText } = getTimeRemaining(bet.closingAt);
                const wager = bet.perUserWager ?? 0;
                const pot = wager * (bet.participants?.length ?? 0);

                return (
                  <li
                    key={bet.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col text-left shadow-md hover:border-orange-500 hover:scale-[1.02] transition-transform duration-200"
                  >
                    <div className="flex justify-between text-xs mb-2 text-gray-400">
                      <span>By {bet.creatorId}</span>
                      <span className="text-orange-500 font-bold">{countdownText}</span>
                    </div>
                    <p className="font-semibold text-white">{bet.title}</p>
                    {bet.description && (
                      <p className="text-sm text-gray-400 mb-2">{bet.description}</p>
                    )}
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Wager: ${wager}</span>
                      <span>Pot: ${pot}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm text-center">No active bets.</p>
          )}
        </section>

        {/* 🏆 LEADERBOARD */}
        <section className="mt-8">
          {/* Header Row */}
          <div className="flex justify-between w-full items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-orange-400 text-sm font-medium hover:text-orange-300 transition"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          </div>

          {/* Animated Drawer for Leaderboard */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              >
                {/* Mock Leaderboard Data */}
                {[
                  {
                    id: 1,
                    name: "Jake Thomas",
                    balance: 285.25,
                    record: "14-5-1",
                    winPercent: 74,
                    streak: "3W",
                  },
                  {
                    id: 2,
                    name: "Sarah Lee",
                    balance: 263.0,
                    record: "12-7-2",
                    winPercent: 70,
                    streak: "2W",
                  },
                  {
                    id: 3,
                    name: "Evan Ross",
                    balance: 214.5,
                    record: "11-6-1",
                    winPercent: 68,
                    streak: "1W",
                  },
                  {
                    id: 4,
                    name: "Mia Jordan",
                    balance: 175.1,
                    record: "9-8-1",
                    winPercent: 64,
                    streak: "1L",
                  },
                  {
                    id: 5,
                    name: "Chris Allen",
                    balance: 152.75,
                    record: "8-9-0",
                    winPercent: 61,
                    streak: "2L",
                  },
                  {
                    id: 6,
                    name: "Ava Carter",
                    balance: 125.2,
                    record: "8-11-0",
                    winPercent: 57,
                    streak: "1W",
                  },
                  {
                    id: 7,
                    name: "Ryan Davis",
                    balance: 101.75,
                    record: "7-10-1",
                    winPercent: 54,
                    streak: "3L",
                  },
                  {
                    id: 8,
                    name: "Lily Brooks",
                    balance: 88.9,
                    record: "6-10-0",
                    winPercent: 52,
                    streak: "1W",
                  },
                  {
                    id: 9,
                    name: "Ben Harris",
                    balance: 77.45,
                    record: "5-12-1",
                    winPercent: 49,
                    streak: "2W",
                  },
                  {
                    id: 10,
                    name: "Nina Patel",
                    balance: 61.8,
                    record: "4-13-1",
                    winPercent: 45,
                    streak: "1L",
                  },
                ]
                  .sort((a, b) => b.balance - a.balance)
                  .map((user, i) => {
                    const isHidden = i >= 5 && !expanded;
                    return (
                      <AnimatePresence key={user.id}>
                        {!isHidden && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 mb-2 last:border-none last:mb-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-white">
                                #{i + 1} {user.name}
                              </span>
                            </div>
                            <div className="flex gap-5 text-right">
                              <span
                                className={`font-semibold ${
                                  user.balance >= 0 ? "text-green-400" : "text-red-400"
                                }`}
                              >
                                ${user.balance.toFixed(2)}
                              </span>
                              <span className="text-gray-300">{user.record}</span>
                              <span className="text-gray-300">{user.winPercent}%</span>
                              <span
                                className={`font-bold ${
                                  user.streak.includes("W")
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {user.streak}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    );
                  })}

                {/* Right-aligned "Show Less" button */}
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
          {/* Header bar — matches Leaderboard styling */}
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
                      (a, b) =>
                        new Date(b.closingAt).getTime() - new Date(a.closingAt).getTime()
                    )
                    .map((bet) => {
                      const isExpanded = expandedBetId === bet.id;
                      const { text: countdownText } = getTimeRemaining(bet.closingAt);
                      const wager = bet.perUserWager ?? 0;
                      const pot = wager * (bet.participants?.length ?? 0);
                      const result = bet.result || "Pending";

                      const closedAt = new Date(bet.closingAt);
                      const formattedClosed = closedAt.toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <motion.div
                          key={bet.id}
                          layout
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          onClick={() =>
                            setExpandedBetId(isExpanded ? null : bet.id)
                          }
                          className={`cursor-pointer border border-orange-400/40 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-400/10 transition-all ${
                            isExpanded ? "p-4" : "p-3"
                          }`}
                        >
                          {/* Collapsed Header Row */}
                          <div className="flex justify-between items-center text-sm">
                            <div>
                              <p className="font-semibold text-white">{bet.title}</p>
                              <p className="text-xs text-gray-400">
                                Bet closed at {formattedClosed}
                              </p>
                            </div>
                            <span
                              className={`text-sm font-bold ${
                                result === "WIN"
                                  ? "text-green-400"
                                  : result === "LOSS"
                                  ? "text-red-400"
                                  : "text-gray-300"
                              }`}
                            >
                              {result}
                            </span>
                          </div>

                          {/* Drawer Animation */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 text-sm text-gray-300">
                                  {bet.description && (
                                    <p className="mb-2 text-gray-200">
                                      {bet.description}
                                    </p>
                                  )}
                                  <div className="flex justify-between text-gray-300">
                                    <span>By {bet.creatorId}</span>
                                    <span>{countdownText}</span>
                                  </div>
                                  <div className="flex justify-between mt-2">
                                    <span>Wager: ${wager}</span>
                                    <span>Pot: ${pot}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                ) : (
                  <p className="text-gray-500 text-sm text-center">No archived bets.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 text-gray-400 text-xs flex justify-around py-3">
        <button onClick={() => router.push("/home")}>Home</button>
        <button className="text-orange-500 font-medium">Group</button>
        <button onClick={() => router.push("/mybets")}>My Bets</button>
        <button onClick={() => router.push("/settings")}>Settings</button>
      </footer>
    </main>
  );
}