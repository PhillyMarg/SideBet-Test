"use client";

import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../lib/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  limit,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import JudgeBetModal from "../../components/JudgeBetModal";
import ActiveBetCard from "../../components/ActiveBetCard";
import FloatingCreateBetButton from "../../components/FloatingCreateBetButton";
import BetCardSkeleton from "../../components/BetCardSkeleton";
import GroupCardSkeleton from "../../components/GroupCardSkeleton";
import Footer from "../../components/Footer";
import BetFilters, { FilterTab, SortOption } from "../../components/BetFilters";
import { getTimeRemaining } from "../../utils/timeUtils";
import { filterBets, sortBets, getEmptyStateMessage, searchBets } from "../../utils/betFilters";
import { Search } from "lucide-react";

// Lazy load heavy wizard components
const CreateBetWizard = lazy(() => import("../../components/CreateBetWizard"));
const CreateGroupWizard = lazy(() => import("../../components/CreateGroupWizard"));
const OnboardingWizard = lazy(() => import("../../components/OnboardingWizard"));

function getActiveBetCount(bets: any[], groupId: string) {
  return bets.filter((b) => b.groupId === groupId && b.status !== "JUDGED").length;
}

export default function HomePage() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBets, setShowAllBets] = useState(false);
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [judgingBet, setJudgingBet] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  // Filter and sort state (for bets)
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("closingSoon");
  const [searchQuery, setSearchQuery] = useState("");

  // Groups filtering state
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all"); // "all" | "hasRecentBets" | "hasClosingSoon"
  const [groupSortBy, setGroupSortBy] = useState("alphabetical");
  const [groupBetsMap, setGroupBetsMap] = useState<{ [groupId: string]: any[] }>({});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error: any) {
      console.error("❌ Logout error:", error);
      alert(`Failed to logout: ${error.message || error}`);
    }
  };

  const handleOnboardingComplete = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { onboardingCompleted: true }, { merge: true });
      setOnboardingCompleted(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
  };


  // 🔁 Countdown force re-render (only if there are active bets with countdowns)
  useEffect(() => {
    const activeBets = bets.filter((bet) => bet.status !== "JUDGED");
    const hasActiveCountdowns = activeBets.some(
      (bet) => !getTimeRemaining(bet.closingAt).isClosed
    );

    if (!hasActiveCountdowns) return; // Don't update if no active countdowns

    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [bets]);

  // 👤 Auth + Firestore (fixed real-time listener)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      const uid = firebaseUser.uid;

      // ✅ Real-time listener for groups
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", uid),
        limit(50)
      );
      const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
        const groupsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
        setLoading(false); // ← Set loading to false after groups load
      });

      // ✅ Real-time listener for bets created OR joined
      const betsCreatedQuery = query(
        collection(db, "bets"),
        where("creatorId", "==", uid),
        limit(50)
      );
      const betsJoinedQuery = query(
        collection(db, "bets"),
        where("participants", "array-contains", uid),
        limit(50)
      );

      const unsubCreated = onSnapshot(betsCreatedQuery, (snapshot) => {
        const created = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          return [
            ...prev.filter((b) => !created.some((c) => c.id === b.id)),
            ...created,
          ];
        });
      });

      const unsubJoined = onSnapshot(betsJoinedQuery, (snapshot) => {
        const joined = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          return [
            ...prev.filter((b) => !joined.some((j) => j.id === b.id)),
            ...joined,
          ];
        });
      });

      // ✅ Cleanup all listeners
      return () => {
        unsubGroups();
        unsubCreated();
        unsubJoined();
      };
    });

    return () => unsubAuth();
  }, [router]);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists() || !userDoc.data()?.onboardingCompleted) {
          setOnboardingCompleted(false);
          setShowOnboarding(true);
        } else {
          setOnboardingCompleted(true);
          setShowOnboarding(false);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboarding();
  }, [user]);

  // 🔁 Real-time active bet count per group
  useEffect(() => {
    if (!bets.length || !groups.length) return;

    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        activeCount: getActiveBetCount(bets, g.id),
      }))
    );
  }, [bets]);

  // Organize bets by group for filtering
  useEffect(() => {
    if (groups.length === 0) return;

    const betsMap: { [groupId: string]: any[] } = {};
    groups.forEach(group => {
      betsMap[group.id] = bets.filter(bet => bet.groupId === group.id);
    });

    setGroupBetsMap(betsMap);
  }, [groups, bets]);

  const activeBets = bets.filter((bet) => bet.status !== "JUDGED");

  // Apply filters and sorting
  const filteredAndSortedBets = useMemo(() => {
    if (!user) return [];
    // 1. Filter by active tab
    const tabFiltered = filterBets(activeBets, activeTab, user.uid);
    // 2. Apply search filter
    const searchFiltered = searchBets(tabFiltered, searchQuery);
    // 3. Apply sort
    const sorted = sortBets(searchFiltered, sortBy, groups);
    return sorted;
  }, [activeBets, activeTab, searchQuery, sortBy, user, groups]);

  // Helper function: Does group have bets in last 7 days?
  const hasRecentBets = (groupId: string) => {
    const groupBets = groupBetsMap[groupId] || [];
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return groupBets.some(bet =>
      new Date(bet.createdAt).getTime() > sevenDaysAgo
    );
  };

  // Helper function: Does group have bets closing in next 24 hours?
  const hasClosingSoonBets = (groupId: string) => {
    const groupBets = groupBetsMap[groupId] || [];
    const now = Date.now();
    const oneDayFromNow = now + (24 * 60 * 60 * 1000);

    return groupBets.some(bet => {
      const closingTime = new Date(bet.closingAt).getTime();
      return closingTime > now && closingTime <= oneDayFromNow && bet.status === "OPEN";
    });
  };

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let displayGroups = groups;

    // 1. Apply filter
    if (groupFilter === "hasRecentBets") {
      displayGroups = groups.filter(group => hasRecentBets(group.id));
    } else if (groupFilter === "hasClosingSoon") {
      displayGroups = groups.filter(group => hasClosingSoonBets(group.id));
    }

    // 2. Apply search
    if (groupSearchQuery.trim()) {
      displayGroups = displayGroups.filter(group => {
        const query = groupSearchQuery.toLowerCase();
        const name = group.name.toLowerCase();
        const tagline = group.tagline?.toLowerCase() || "";
        return name.includes(query) || tagline.includes(query);
      });
    }

    // 3. Apply sort
    const sorted = [...displayGroups].sort((a, b) => {
      switch (groupSortBy) {
        case "alphabetical":
          return a.name.localeCompare(b.name);
        case "mostBets":
          return (groupBetsMap[b.id]?.length || 0) - (groupBetsMap[a.id]?.length || 0);
        case "memberCount":
          return (b.memberIds?.length || 0) - (a.memberIds?.length || 0);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [groups, groupFilter, groupSearchQuery, groupSortBy, groupBetsMap]);

  const getGroupName = (groupId: string) =>
    groups.find((g) => g.id === groupId)?.name || "Unknown Group";

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
      setShowCreateBet(false);
    } catch (err) {
      console.error("Error creating bet:", err);
      alert("Failed to create bet. Please try again.");
    }
  };

  const handleUserPick = async (bet: any, pick: string | number) => {
    if (!user) return;

    const uid = user.uid;

    try {
      const updatedPicks = { ...bet.picks, [uid]: pick };
      const updatedParticipants = Array.from(
        new Set([...(bet.participants || []), uid])
      );

      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        picks: updatedPicks,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      setBets((prev) =>
        prev.map((b) =>
          b.id === bet.id
            ? {
                ...b,
                picks: updatedPicks,
                participants: updatedParticipants,
                userPick: pick,
              }
            : b
        )
      );
    } catch (err) {
      console.error("Error updating bet pick:", err);
      alert("Failed to place bet. Please try again.");
    }
  };

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
        min_bet: groupData.min_bet || 0,
        max_bet: groupData.max_bet || 0,
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
    } catch (error: any) {
      console.error("Error creating group:", error);
      alert(`Failed to create group. Error: ${error.message || JSON.stringify(error)}`);
    }
  };

  // Only redirect if not loading and no user
  if (!loading && !user) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Redirecting to login...</p>
      </main>
    );
  }

  return (
    <>
      <main
        className="min-h-screen bg-black text-white flex flex-col pb-16 sm:pb-20 pt-20 relative overflow-y-auto"
        style={{ "--content-width": "500px" } as React.CSSProperties}
      >
        {/* Active Bets */}
      <section className="flex flex-col items-center text-center mt-4">
        <h2 className="text-lg font-semibold mb-3 text-white px-4">Active Bets</h2>

        {loading ? (
          <ul
            className="space-y-2 sm:space-y-3 w-[95%] sm:w-[92%] mx-auto px-4"
            style={{ maxWidth: "var(--content-width)" }}
          >
            {[...Array(3)].map((_, i) => (
              <BetCardSkeleton key={i} />
            ))}
          </ul>
        ) : activeBets.length > 0 ? (
          <>
            {/* Bet Filters - Tabs, Search, and Sort */}
            {user && (
              <BetFilters
                bets={activeBets}
                userId={user.uid}
                groups={groups}
                activeTab={activeTab}
                sortBy={sortBy}
                onTabChange={setActiveTab}
                onSortChange={setSortBy}
                showGroupSort={true}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            )}

            {/* Filtered and Sorted Bets */}
            {filteredAndSortedBets.length > 0 ? (
              <>
                <ul
                  className="space-y-2 sm:space-y-3 w-[95%] sm:w-[92%] mx-auto px-4 mt-4"
                  style={{ maxWidth: "var(--content-width)" }}
                >
                  {(showAllBets ? filteredAndSortedBets : filteredAndSortedBets.slice(0, 5)).map((bet) => (
                    <li key={bet.id}>
                      <ActiveBetCard
                        bet={bet}
                        user={user}
                        onPick={handleUserPick}
                        onJudge={setJudgingBet}
                        groupName={getGroupName(bet.groupId)}
                      />
                    </li>
                  ))}
                </ul>
                {filteredAndSortedBets.length > 5 && (
                  <button
                    onClick={() => setShowAllBets(!showAllBets)}
                    className="mt-5 text-sm text-orange-500 hover:text-orange-400 font-medium transition"
                  >
                    {showAllBets ? "Show Less" : `Show All (${filteredAndSortedBets.length})`}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center mt-6 px-4">
                {searchQuery.trim() ? (
                  <>
                    <p className="text-zinc-400 text-sm">
                      No bets found for "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-orange-500 text-sm hover:text-orange-400 transition"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {getEmptyStateMessage(activeTab)}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm px-4">
            No active bets found. Create a new one!
          </p>
        )}
      </section>

      {/* Groups Section */}
      <section className="p-4 flex flex-col items-center text-center mt-6">
        <h2 className="text-lg font-semibold mb-3 text-white">Groups</h2>

        {loading ? (
          <ul
            className="space-y-4 w-full mx-auto"
            style={{ maxWidth: "var(--content-width)" }}
          >
            {[...Array(2)].map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </ul>
        ) : groups.length > 0 ? (
          <>
            {/* Single Row: Search + Filters */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 mb-4 w-full mx-auto"
              style={{ maxWidth: "var(--content-width)" }}
            >
              {/* Search */}
              <div className="flex-1 max-w-[45%] sm:max-w-[50%]">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-7 pr-2 py-1.5 sm:py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="flex-shrink-0 w-[28%] sm:w-[25%]">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-1.5 sm:px-2 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 truncate"
                >
                  <option value="all">All</option>
                  <option value="hasRecentBets">Recent</option>
                  <option value="hasClosingSoon">Soon</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex-shrink-0 w-[28%] sm:w-[25%]">
                <select
                  value={groupSortBy}
                  onChange={(e) => setGroupSortBy(e.target.value)}
                  className="w-full px-1.5 sm:px-2 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 truncate"
                >
                  <option value="alphabetical">A-Z</option>
                  <option value="mostBets">Bets</option>
                  <option value="memberCount">Members</option>
                  <option value="newest">New</option>
                </select>
              </div>
            </div>

            {/* Groups List */}
            {filteredAndSortedGroups.length === 0 ? (
              <div className="text-center py-12 px-4">
                {groupSearchQuery.trim() ? (
                  <>
                    <p className="text-zinc-400 text-sm mb-2">
                      No groups found for "{groupSearchQuery}"
                    </p>
                    <button
                      onClick={() => setGroupSearchQuery("")}
                      className="text-orange-500 text-sm hover:text-orange-600"
                    >
                      Clear search
                    </button>
                  </>
                ) : groupFilter === "hasRecentBets" ? (
                  <p className="text-zinc-400 text-sm">
                    No groups with recent bets (last 7 days)
                  </p>
                ) : groupFilter === "hasClosingSoon" ? (
                  <p className="text-zinc-400 text-sm">
                    No groups with bets closing in the next 24 hours
                  </p>
                ) : (
                  <p className="text-zinc-400 text-sm">
                    No groups yet. Create or join one to get started!
                  </p>
                )}
              </div>
            ) : (
              <ul
                className="space-y-4 w-full mx-auto"
                style={{ maxWidth: "var(--content-width)" }}
              >
                {filteredAndSortedGroups.map((group) => {
                  const activeCount = bets.filter(
                    (bet) => bet.groupId === group.id && bet.status !== "JUDGED"
                  ).length;

                  return (
                    <li
                      key={group.id}
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col text-left shadow-md hover:border-orange-500 hover:scale-[1.02] transition-transform duration-200 text-base cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-white text-sm sm:text-base">
                          {group.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {group.memberIds?.length ?? 0} members
                        </p>
                      </div>

                      {group.tagline && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {group.tagline}
                        </p>
                      )}

                      <div className="flex justify-between text-sm text-gray-400">
                        <span>
                          Wager Range:{" "}
                          {group.settings?.min_bet && group.settings?.max_bet
                            ? `$${group.settings.min_bet} – $${group.settings.max_bet}`
                            : "Not set"}
                        </span>
                        <span
                          className={`font-semibold ${
                            activeCount > 0 ? "text-orange-500" : "text-gray-500"
                          }`}
                        >
                          {activeCount > 0
                            ? `${activeCount} Active Bets`
                            : "No Active Bets"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            You haven't joined any groups yet.
          </p>
        )}

        <button
          onClick={() => setShowCreateGroup(true)}
          className="mt-6 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 hover:shadow-[0_0_10px_2px_rgba(38,38,38,0.5)] transition duration-200"
        >
          Create Group
        </button>
      </section>

      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingWizard
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            onComplete={handleOnboardingComplete}
            onCreateGroup={() => {
              setShowOnboarding(false);
              setShowCreateGroup(true);
            }}
            onJoinGroup={() => {
              setShowOnboarding(false);
              setShowJoinGroup(true);
            }}
          />
        </Suspense>
      )}

      {showCreateBet && (
        <Suspense fallback={null}>
          <CreateBetWizard
            isOpen={showCreateBet}
            onClose={() => setShowCreateBet(false)}
            groups={groups}
            onCreateBet={handleCreateBet}
          />
        </Suspense>
      )}

      {showCreateGroup && (
        <Suspense fallback={null}>
          <CreateGroupWizard
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onCreateGroup={handleCreateGroup}
          />
        </Suspense>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 transition-opacity duration-300 ease-out"
          onClick={() => setShowJoinGroup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5 transform transition-all duration-300 ease-out"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Join a Group
            </h3>

            <p className="text-sm text-gray-400 mb-3 text-center">
              Enter an <span className="text-orange-400 font-medium">Access Code</span>{" "}
              or paste a{" "}
              <span className="text-orange-400 font-medium">Join Link</span> to join a
              group.
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
                onClick={async () => {
                  if (!joinInput) return alert("Please enter a code or link.");
                  if (!user) return alert("You must be signed in to join a group.");

                  try {
                    const input = joinInput.trim().toUpperCase();
                    const groupsRef = collection(db, "groups");

                    const codeQuery = query(
                      groupsRef,
                      where("accessCode", "==", input)
                    );
                    const linkQuery = query(
                      groupsRef,
                      where("joinLink", "==", input)
                    );

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

                    const groupRef = matchSnap.ref;
                    const groupData = matchSnap.data();

                    if (groupData.memberIds?.includes(user.uid)) {
                      alert("You're already a member of this group!");
                      return;
                    }

                    await updateDoc(groupRef, {
                      memberIds: [...(groupData.memberIds || []), user.uid],
                    });

                    alert(`✅ Successfully joined "${groupData.name}"`);
                    setShowJoinGroup(false);
                    setJoinInput("");
                  } catch (err) {
                    console.error("Error joining group:", err);
                    alert("Failed to join group. Please try again.");
                  }
                }}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Judge Bet Modal */}
      {judgingBet && (
        <JudgeBetModal bet={judgingBet} onClose={() => setJudgingBet(null)} />
      )}

      <Footer />

      <FloatingCreateBetButton
        groups={groups}
        onCreateBet={handleCreateBet}
      />
      </main>
    </>
  );
}