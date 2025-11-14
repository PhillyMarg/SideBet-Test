"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import CreateGroupWizard from "../../components/CreateGroupWizard";
import Footer from "../../components/Footer";
import FloatingCreateBetButton from "../../components/FloatingCreateBetButton";
import Header from "../../components/Header";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupStats, setGroupStats] = useState<any[]>([]);
  const [groupActiveBets, setGroupActiveBets] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Aggregate stats
  const [totalGroups, setTotalGroups] = useState(0);
  const [overallWinRate, setOverallWinRate] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [activeBetsCount, setActiveBetsCount] = useState(0);
  const [totalBetsPlaced, setTotalBetsPlaced] = useState(0);
  const [currentStreak, setCurrentStreak] = useState({ count: 0, type: "W" });

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");

  // Fetch groups and stats
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      try {
        // Fetch user's groups
        const groupsQuery = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", firebaseUser.uid)
        );
        const groupsSnap = await getDocs(groupsQuery);
        const groupsData = groupsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Fetch active bets count for each group
        const activeBetsMap: { [key: string]: number } = {};
        const activeBetsPromises = groupsData.map(async (group) => {
          const betsQuery = query(
            collection(db, "bets"),
            where("groupId", "==", group.id)
          );
          const betsSnap = await getDocs(betsQuery);
          
          const activeBetsCount = betsSnap.docs.filter(
            (doc) => doc.data().status !== "JUDGED"
          ).length;
          
          activeBetsMap[group.id] = activeBetsCount;
        });

        await Promise.all(activeBetsPromises);
        setGroupActiveBets(activeBetsMap);

        // Sort groups by number of active bets (descending)
        const sortedGroups = groupsData.sort(
          (a, b) => (activeBetsMap[b.id] || 0) - (activeBetsMap[a.id] || 0)
        );

        setGroups(sortedGroups);
        setTotalGroups(sortedGroups.length);

        // Fetch stats for each group
        const statsPromises = sortedGroups.map(async (group) => {
          const leaderboardQuery = query(
            collection(db, "leaderboards"),
            where("group_id", "==", group.id),
            where("user_id", "==", firebaseUser.uid)
          );
          const leaderboardSnap = await getDocs(leaderboardQuery);

          if (!leaderboardSnap.empty) {
            return {
              groupId: group.id,
              ...leaderboardSnap.docs[0].data(),
            };
          }
          return null;
        });

        const stats = (await Promise.all(statsPromises)).filter(Boolean);
        setGroupStats(stats);

        // Calculate aggregate stats
        let totalWins = 0;
        let totalLosses = 0;
        let totalTies = 0;
        let totalBalance = 0;
        let longestStreak = { count: 0, type: "W" };

        stats.forEach((stat: any) => {
          totalWins += stat.wins || 0;
          totalLosses += stat.losses || 0;
          totalTies += stat.ties || 0;
          totalBalance += stat.balance || 0;

          const streakCount = stat.current_streak || 0;
          const streakType = stat.streak_type || "W";
          if (streakCount > longestStreak.count) {
            longestStreak = { count: streakCount, type: streakType };
          }
        });

        const totalGames = totalWins + totalLosses + totalTies;
        const winRate =
          totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        setOverallWinRate(winRate);
        setTotalWon(totalBalance);
        setTotalBetsPlaced(totalGames);
        setCurrentStreak(longestStreak);

        const totalActiveBets = Object.values(activeBetsMap).reduce(
          (sum, count) => sum + count,
          0
        );
        setActiveBetsCount(totalActiveBets);
      } catch (error) {
        console.error("Error fetching groups and stats:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Create Group Handler
  const handleCreateGroup = async (groupData: any) => {
    if (!user) {
      alert("You must be signed in to create a group.");
      return;
    }

    const groupDoc = {
      name: groupData.name,
      tagline: groupData.tagline || "",
      admin_id: user.uid,
      memberIds: [user.uid],
      settings: {
        min_bet: groupData.min_bet,
        max_bet: groupData.max_bet,
        starting_balance: 0,
        season_enabled: groupData.season_enabled,
        season_type: groupData.season_type || "none",
        season_end_date: groupData.season_end_date || null,
        auto_renew: groupData.auto_renew,
      },
      inviteType: groupData.inviteType,
      joinLink: groupData.joinLink,
      accessCode: groupData.accessCode,
      created_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "groups"), groupDoc);
      alert("✅ Group created successfully!");
      window.location.reload();
    } catch (error: any) {
      console.error("Firestore error:", error);
      alert(`Failed to create group: ${error.message || "Unknown error"}`);
    }
  };

  // Create Bet Handler
  const handleCreateBet = async (betData: any) => {
    if (betData.type === "OVER_UNDER" && !betData.line) {
      alert("Please set a valid line ending in .5 for Over/Under bets.");
      return;
    }

    if (!user || !betData.title.trim() || !betData.groupId || !betData.wager) {
      alert("Please complete all required fields.");
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
      alert("✅ Bet created successfully!");
    } catch (err) {
      console.error("Error creating bet:", err);
      alert("Failed to create bet. Please try again.");
    }
  };

  // Join Group Handler
  const handleJoinGroup = async () => {
    if (!joinInput) {
      alert("Please enter a code or link.");
      return;
    }

    if (!user) {
      alert("You must be signed in to join a group.");
      return;
    }

    try {
      const input = joinInput.trim().toUpperCase();
      const groupsRef = collection(db, "groups");

      const codeQuery = query(groupsRef, where("accessCode", "==", input));
      const linkQuery = query(groupsRef, where("joinLink", "==", input));

      const [codeSnap, linkSnap] = await Promise.all([
        getDocs(codeQuery),
        getDocs(linkQuery),
      ]);

      const matchSnap = !codeSnap.empty
        ? codeSnap.docs[0]
        : !linkSnap.empty
        ? linkSnap.docs[0]
        : null;

      if (!matchSnap) {
        alert("No group found. Please check the code or link.");
        return;
      }

      const groupData = matchSnap.data();

      if (groupData.memberIds?.includes(user.uid)) {
        alert("You're already a member of this group!");
        return;
      }

      await updateDoc(matchSnap.ref, {
        memberIds: [...(groupData.memberIds || []), user.uid],
      });

      alert(`✅ Successfully joined "${groupData.name}"`);
      setShowJoinGroup(false);
      setJoinInput("");
      window.location.reload();
    } catch (err) {
      console.error("Error joining group:", err);
      alert("Failed to join group. Please try again.");
    }
  };

  const getGroupBalance = (groupId: string) => {
    const stat = groupStats.find((s: any) => s.groupId === groupId);
    return stat?.balance || 0;
  };

  const getGroupRecord = (groupId: string) => {
    const stat = groupStats.find((s: any) => s.groupId === groupId);
    if (!stat) return "0-0-0";
    return `${stat.wins || 0}-${stat.losses || 0}-${stat.ties || 0}`;
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </main>
    );
  }

  const visibleGroups = showAllGroups ? groups : groups.slice(0, 5);
  const hasMoreGroups = groups.length > 5;

  return (
    <>
      <Header />
      <main
        className="min-h-screen bg-black text-white pb-20 flex flex-col items-center"
        style={{ "--content-width": "500px" } as React.CSSProperties}
      >
      <div
        className="w-[92%] mx-auto py-6"
        style={{ maxWidth: "var(--content-width)" }}
      >
        {/* Stats Section */}
        <section className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Your Stats</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Groups</p>
              <p className="text-2xl font-bold text-white">{totalGroups}</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-white">{overallWinRate}%</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Won</p>
              <p
                className={`text-2xl font-bold ${
                  totalWon >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {totalWon >= 0 ? "+" : ""}${totalWon.toFixed(2)}
              </p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Active Bets</p>
              <p className="text-2xl font-bold text-white">{activeBetsCount}</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total Bets</p>
              <p className="text-2xl font-bold text-white">{totalBetsPlaced}</p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Current Streak</p>
              <p
                className={`text-2xl font-bold ${
                  currentStreak.type === "W" && currentStreak.count > 0
                    ? "text-green-400"
                    : currentStreak.type === "L" && currentStreak.count > 0
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {currentStreak.count > 0
                  ? `${currentStreak.count}${currentStreak.type}`
                  : "-"}
              </p>
            </div>
          </div>
        </section>

        {/* My Groups Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">My Groups</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Create Group
              </button>
              <button
                onClick={() => setShowJoinGroup(true)}
                className="px-4 py-2 border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white text-sm font-semibold rounded-lg transition-all"
              >
                Join Group
              </button>
            </div>
          </div>

          {groups.length > 0 ? (
            <>
              <div className="space-y-4">
                {visibleGroups.map((group) => {
                  const balance = getGroupBalance(group.id);
                  const record = getGroupRecord(group.id);
                  const activeBets = groupActiveBets[group.id] || 0;

                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-orange-500/50 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {group.name}
                          </h3>
                          {group.tagline && (
                            <p className="text-sm text-gray-400 mt-1">
                              {group.tagline}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              balance >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-4 text-gray-400">
                          <span>{group.memberIds?.length || 0} members</span>
                          <span>{record}</span>
                          <span className="text-orange-400 font-semibold">
                            {activeBets} active bet{activeBets !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-orange-400 font-medium">
                          View →
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {hasMoreGroups && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllGroups(!showAllGroups)}
                    className="px-6 py-2 border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg font-medium transition-all"
                  >
                    {showAllGroups
                      ? "Show Less"
                      : `View More (${groups.length - 5} more)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-4">
                You're not in any groups yet.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all"
                >
                  Create Your First Group
                </button>
                <button
                  onClick={() => setShowJoinGroup(true)}
                  className="px-6 py-2 border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white font-semibold rounded-lg transition-all"
                >
                  Join a Group
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Create Group Wizard */}
      <CreateGroupWizard
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div
          className="fixed inset-0 flex justify-center items-center z-[100] bg-black/60"
          onClick={() => setShowJoinGroup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Join a Group
            </h3>

            <p className="text-sm text-gray-400 mb-3 text-center">
              Enter an{" "}
              <span className="text-orange-400 font-medium">Access Code</span>{" "}
              or paste a{" "}
              <span className="text-orange-400 font-medium">Join Link</span> to
              join a group.
            </p>

            <input
              type="text"
              placeholder="Enter access code or join link"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.trim())}
              className="w-full bg-zinc-800 text-white p-3 rounded-md text-sm border border-zinc-700 mb-4 focus:outline-none focus:border-orange-500"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowJoinGroup(false)}
                className="text-gray-400 border border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinGroup}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Footer */}
<Footer />

      {/* Floating Create Bet Button */}
      <FloatingCreateBetButton
        groups={groups}
        onCreateBet={handleCreateBet}
      />
      </main>
    </>
  );
}