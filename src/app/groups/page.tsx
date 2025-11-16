"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import CreateGroupWizard from "../../components/CreateGroupWizard";
import Footer from "../../components/Footer";
import FloatingCreateBetButton from "../../components/FloatingCreateBetButton";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { Search, X, LogOut, Users, Dices } from "lucide-react";
import { removeUserFromGroupBets } from "../../utils/groupHelpers";
import { arrayRemove, doc } from "firebase/firestore";

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupStats, setGroupStats] = useState<any[]>([]);
  const [groupActiveBets, setGroupActiveBets] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Filter, Search & Sort State
  const [activeTab, setActiveTab] = useState<"all" | "admin" | "member">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("alphabetical");

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

  // Leave Group state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState<{ id: string; name: string } | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

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
            where("groupId", "==", group.id),
            limit(10)
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
            where("user_id", "==", firebaseUser.uid),
            limit(1)
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

  // Leave Group Handler
  const handleLeaveGroup = (groupId: string, groupName: string) => {
    setGroupToLeave({ id: groupId, name: groupName });
    setShowLeaveModal(true);
  };

  const confirmLeaveGroup = async () => {
    if (!groupToLeave || !user || isLeaving) return;

    try {
      setIsLeaving(true);

      // Step 1: Remove user's picks from all group bets
      await removeUserFromGroupBets(groupToLeave.id, user.uid);

      // Step 2: Remove user from group members
      const groupRef = doc(db, "groups", groupToLeave.id);
      await updateDoc(groupRef, {
        memberIds: arrayRemove(user.uid),
      });

      alert(`✅ You've left ${groupToLeave.name}`);
      setShowLeaveModal(false);
      setGroupToLeave(null);

      // Refresh the page to update groups list
      window.location.reload();
    } catch (error: any) {
      console.error("Error leaving group:", error);
      alert(`Failed to leave group: ${error.message}`);
    } finally {
      setIsLeaving(false);
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

  // Calculate counts for each tab
  const allGroupsCount = groups.length;
  const adminGroupsCount = groups.filter(
    (g) => g.admin_id === user?.uid
  ).length;
  const memberGroupsCount = groups.filter(
    (g) => g.memberIds.includes(user?.uid) && g.admin_id !== user?.uid
  ).length;

  // Apply filters and sort
  let displayGroups = groups;

  // 1. Filter by active tab
  if (activeTab === "admin") {
    displayGroups = groups.filter((g) => g.admin_id === user?.uid);
  } else if (activeTab === "member") {
    displayGroups = groups.filter(
      (g) => g.memberIds.includes(user?.uid) && g.admin_id !== user?.uid
    );
  }
  // "all" shows all groups (no filtering needed)

  // 2. Apply search filter
  if (searchQuery.trim()) {
    displayGroups = displayGroups.filter((group) => {
      const query = searchQuery.toLowerCase();
      const name = group.name.toLowerCase();
      const tagline = group.tagline?.toLowerCase() || "";
      return name.includes(query) || tagline.includes(query);
    });
  }

  // 3. Apply sort
  const sortedGroups = [...displayGroups].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical":
        return a.name.localeCompare(b.name);
      case "recentActivity":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "memberCount":
        return (b.memberIds?.length || 0) - (a.memberIds?.length || 0);
      case "newest":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return 0;
    }
  });

  const visibleGroups = showAllGroups ? sortedGroups : sortedGroups.slice(0, 5);
  const hasMoreGroups = sortedGroups.length > 5;

  return (
    <>
      <main
        className="min-h-screen bg-black text-white pb-16 sm:pb-20 pt-20 flex flex-col items-center"
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

          {/* Filter & Search Section - 2 Row Layout */}
          <div className="bg-black border border-zinc-800 rounded-xl py-3 space-y-3 mb-4">
            {/* Row 1: Filter Tabs */}
            <div className="grid grid-cols-3 gap-2 px-4 sm:px-6">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md transition-colors ${
                  activeTab === "all"
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                All Groups
                {allGroupsCount > 0 && (
                  <span className="ml-1 text-xs">({allGroupsCount})</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("admin")}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md transition-colors ${
                  activeTab === "admin"
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                Admin
                {adminGroupsCount > 0 && (
                  <span className="ml-1 text-xs">({adminGroupsCount})</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("member")}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md transition-colors ${
                  activeTab === "member"
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                Member
                {memberGroupsCount > 0 && (
                  <span className="ml-1 text-xs">({memberGroupsCount})</span>
                )}
              </button>
            </div>

            {/* Row 2: Search + Sort */}
            <div className="flex items-center gap-2 px-4 sm:px-6">
              {/* Search Bar - 60% width */}
              <div className="flex-1 max-w-[60%]">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search groups..."
                    className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 hover:text-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort Dropdown - 40% width */}
              <div className="flex-shrink-0 max-w-[40%] w-full">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="alphabetical">A-Z</option>
                  <option value="recentActivity">Recent Activity</option>
                  <option value="memberCount">Most Members</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </div>

          {sortedGroups.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              {searchQuery.trim() ? (
                <>
                  <p className="text-zinc-400 text-sm mb-2">
                    No groups found for "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-orange-500 text-sm hover:text-orange-600"
                  >
                    Clear search
                  </button>
                </>
              ) : activeTab === "admin" ? (
                <p className="text-zinc-400 text-sm">
                  You don't admin any groups yet. Create one to get started!
                </p>
              ) : activeTab === "member" ? (
                <p className="text-zinc-400 text-sm">
                  You're not a member of any groups. Join or create one!
                </p>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
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
                      className="
                        relative
                        rounded-2xl
                        p-4 sm:p-5
                        min-h-[88px] sm:min-h-[90px]
                        cursor-pointer
                        transition-all duration-200
                        hover:scale-[1.02]
                        hover:shadow-lg hover:shadow-orange-500/20
                        active:scale-[0.98]
                        bg-gradient-to-b from-orange-500/20 via-orange-500/10 to-black
                        flex flex-col justify-center
                        gap-2 sm:gap-3
                      "
                    >
                      {/* Balance Badge - Top Right Corner */}
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <div
                          className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-lg ${
                            balance >= 0
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                        </div>
                        {/* Leave Button - Only show if member and not admin */}
                        {group.memberIds?.includes(user?.uid) && group.admin_id !== user?.uid && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveGroup(group.id, group.name);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row 1: Group Name (left) + Members (right) */}
                      <div className="flex items-center justify-between pr-20">
                        {/* Group Name */}
                        <h3 className="text-base sm:text-lg font-bold text-white truncate flex-1 mr-3">
                          {group.name}
                        </h3>

                        {/* Members Count */}
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-zinc-300 flex-shrink-0">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="font-medium">{group.memberIds?.length || 0}</span>
                        </div>
                      </div>

                      {/* Row 2: Wager Range (left) + Active Bets (right) */}
                      <div className="flex items-center justify-between">
                        {/* Wager Range */}
                        <div className="text-xs sm:text-sm text-zinc-400">
                          ${group.settings?.min_bet || 0} - ${group.settings?.max_bet || 0}
                        </div>

                        {/* Active Bets - Conditional styling and text */}
                        <div className={`flex items-center gap-1 text-xs sm:text-sm flex-shrink-0 ${
                          activeBets > 0 ? 'text-orange-500' : 'text-zinc-400'
                        }`}>
                          <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="font-medium">
                            {activeBets > 0 ? activeBets : 'No active bets'}
                          </span>
                        </div>
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
                      : `View More (${sortedGroups.length - 5} more)`}
                  </button>
                </div>
              )}
            </>
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

    {/* Leave Group Confirmation Modal */}
    {showLeaveModal && groupToLeave && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={() => setShowLeaveModal(false)}
      >
        <div
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm w-full relative z-[61] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowLeaveModal(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-lg font-semibold text-white mb-3">
            Leave Group?
          </h3>

          <p className="text-sm text-zinc-400 mb-2">
            Are you sure you want to leave "<span className="text-white font-medium">{groupToLeave.name}</span>"?
          </p>

          <p className="text-sm text-zinc-400 mb-4">
            You'll be removed from all bets in this group and lose access to group activity.
          </p>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-orange-500">
              ⚠️ Your picks will be removed from active bets in this group.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaveModal(false)}
              disabled={isLeaving}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={confirmLeaveGroup}
              disabled={isLeaving}
              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLeaving ? "Leaving..." : "Leave"}
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