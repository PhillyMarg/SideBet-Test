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
import { GroupBetCard } from "../../components/bets/GroupBetCard";
import FloatingCreateBetButton from "../../components/FloatingCreateBetButton";
import BetCardSkeleton from "../../components/BetCardSkeleton";
import GroupCardSkeleton from "../../components/GroupCardSkeleton";
import { getTimeRemaining } from "../../utils/timeUtils";
import { filterBets, sortBets, getEmptyStateMessage, searchBets } from "../../utils/betFilters";
import { createActivity } from "../../lib/activityHelpers";

// NEW: Import the Figma design components
import { Header } from "../../components/layout/Header";
import { FilterTabs } from "../../components/home/FilterTabs";
import { SearchBar } from "../../components/home/SearchBar";
import { SectionTitle } from "../../components/home/SectionTitle";
import FeedGroupCard from "../../components/FeedGroupCard";

// Lazy load heavy wizard components
const CreateBetWizard = lazy(() => import("../../components/CreateBetWizard"));
const CreateGroupWizard = lazy(() => import("../../components/CreateGroupWizard"));
const OnboardingWizard = lazy(() => import("../../components/OnboardingWizard"));

function getActiveBetCount(bets: any[], groupId: string) {
  return bets.filter((b) => b.groupId === groupId && b.status !== "JUDGED").length;
}

type FilterOption = "ALL" | "OPEN" | "MY PICKS" | "PENDING" | "SOON" | "H2H";

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

  // NEW: Filter and sort state for bets
  const [activeFilter, setActiveFilter] = useState<FilterOption>("ALL");
  const [betSearchQuery, setBetSearchQuery] = useState("");
  const [betSortOption, setBetSortOption] = useState("Closing Soon");

  // Groups filtering state
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupView, setGroupView] = useState("all");
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

    if (!hasActiveCountdowns) return;

    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [bets]);

  // 👤 Auth + Firestore (fixed real-time listener)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      // ✅ Fetch complete user profile from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // ✅ Merge Firebase Auth + Firestore data into user object
          const completeUser = {
            ...firebaseUser,
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: userData.displayName,
          } as any;

          console.log("✅ Complete user object loaded in home page:", completeUser);
          setUser(completeUser);
        } else {
          console.warn("⚠️ User document not found in Firestore");
          setUser(firebaseUser);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(firebaseUser);
      }

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
        setLoading(false);
      });

      // ✅ Real-time listener for bets created OR joined OR challenged (H2H)
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
      // NEW: Query for H2H bets where user is the challengee
      const betsH2HChallengeQuery = query(
        collection(db, "bets"),
        where("challengeeId", "==", uid),
        limit(50)
      );

      const unsubCreated = onSnapshot(betsCreatedQuery, (snapshot) => {
        console.log("Bets created snapshot:", snapshot.docs.length);
        const created = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !created.some((c) => c.id === b.id)),
            ...created,
          ];
        });
      });

      const unsubJoined = onSnapshot(betsJoinedQuery, (snapshot) => {
        console.log("Bets joined snapshot:", snapshot.docs.length);
        const joined = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !joined.some((j) => j.id === b.id)),
            ...joined,
          ];
        });
      });

      const unsubH2HChallenges = onSnapshot(betsH2HChallengeQuery, (snapshot) => {
        console.log("H2H challenges snapshot:", snapshot.docs.length);
        const h2hChallenges = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !h2hChallenges.some((h) => h.id === b.id)),
            ...h2hChallenges,
          ];
        });
      });

      // ✅ Cleanup all listeners
      return () => {
        unsubGroups();
        unsubCreated();
        unsubJoined();
        unsubH2HChallenges();
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

  // Include JUDGED bets in active section so users can see results
  const activeBets = bets;

  // Map FilterOption to existing FilterTab types for compatibility
  const mapFilterToTab = (filter: FilterOption): string => {
    const mapping: Record<FilterOption, string> = {
      "ALL": "all",
      "OPEN": "open",
      "MY PICKS": "picks",
      "PENDING": "pending",
      "SOON": "soon",
      "H2H": "h2h",
    };
    return mapping[filter];
  };

  // Apply filters and sorting
  const filteredAndSortedBets = useMemo(() => {
    if (!user) return [];
    // 1. Filter by active tab
    const tabFiltered = filterBets(activeBets, mapFilterToTab(activeFilter) as any, user.uid);
    // 2. Apply search filter
    const searchFiltered = searchBets(tabFiltered, betSearchQuery);
    // 3. Apply sort
    const sorted = sortBets(searchFiltered, betSortOption as any, groups);

    // 4. CRITICAL: Prioritize pending H2H challenges for this user at the TOP
    const pendingChallenges = sorted.filter(
      bet => bet.isH2H && bet.h2hStatus === "pending" && bet.challengeeId === user.uid
    );
    const otherBets = sorted.filter(
      bet => !(bet.isH2H && bet.h2hStatus === "pending" && bet.challengeeId === user.uid)
    );

    console.log("Pending H2H challenges for user:", pendingChallenges.length);

    return [...pendingChallenges, ...otherBets];
  }, [activeBets, activeFilter, betSearchQuery, betSortOption, user, groups]);

  // Track last active bet time per group
  const getLastBetTime = (groupId: string): number => {
    const groupBets = groupBetsMap[groupId] || [];
    if (groupBets.length === 0) return 0;

    const times = groupBets.map(bet => {
      const created = new Date(bet.createdAt).getTime();
      const updated = bet.updatedAt ? new Date(bet.updatedAt).getTime() : created;
      return Math.max(created, updated);
    });

    return Math.max(...times);
  };

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let displayGroups = groups;

    // 1. Apply search
    if (groupSearchQuery.trim()) {
      displayGroups = displayGroups.filter(group => {
        const query = groupSearchQuery.toLowerCase();
        const name = group.name.toLowerCase();
        const tagline = group.tagline?.toLowerCase() || "";
        return name.includes(query) || tagline.includes(query);
      });
    }

    // 2. Apply view (All vs Recent)
    if (groupView === "recent") {
      const sortedGroups = [...displayGroups].sort((a, b) => {
        return getLastBetTime(b.id) - getLastBetTime(a.id);
      });
      displayGroups = sortedGroups;
    } else {
      const sortedGroups = [...displayGroups].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      displayGroups = sortedGroups;
    }

    return displayGroups;
  }, [groups, groupSearchQuery, groupView, groupBetsMap]);

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
      const betRef = await addDoc(collection(db, "bets"), betDoc);

      // Get user's display name
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const userName = userData?.displayName ||
                      `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                      user.email ||
                      "Unknown User";

      // Create activity
      await createActivity({
        groupId: betData.groupId,
        type: "bet_created",
        userId: user.uid,
        userName: userName,
        betId: betRef.id,
        betTitle: betData.title
      });

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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Header with integrated navigation */}
      <Header userId={user?.uid} />

      {/* Main Content */}
      <main
        style={{
          paddingTop: "100px", // 60px header + 40px nav
          paddingBottom: "80px",
          color: "white",
        }}
      >
        {/* ACTIVE BETS Section */}
        <SectionTitle>ACTIVE BETS</SectionTitle>

        {/* Filter Tabs */}
        <FilterTabs
          selected={activeFilter}
          onSelect={(filter) => setActiveFilter(filter as FilterOption)}
        />

        {/* Search Bar */}
        <SearchBar
          value={betSearchQuery}
          onChange={setBetSearchQuery}
          placeholder="Search Bets..."
        />

        {/* Bet Cards */}
        <section style={{ padding: "0 16px" }}>
          {loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <BetCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {filteredAndSortedBets.length > 0 ? (
                <div>
                  {(showAllBets ? filteredAndSortedBets : filteredAndSortedBets.slice(0, 5)).map((bet) => (
                    <div key={bet.id} style={{ marginBottom: "12px" }}>
                      <GroupBetCard
                        bet={bet}
                        currentUserId={user?.uid || ''}
                        groupName={getGroupName(bet.groupId)}
                        onVote={(betId, vote) => {
                          const targetBet = bets.find(b => b.id === betId);
                          if (targetBet) handleUserPick(targetBet, vote);
                        }}
                        onSubmitGuess={(betId, guess) => {
                          const targetBet = bets.find(b => b.id === betId);
                          if (targetBet) handleUserPick(targetBet, guess);
                        }}
                        onChangeVote={(betId) => {
                          console.log('Change vote:', betId);
                        }}
                        onJudge={(betId, result) => {
                          setJudgingBet(bet);
                        }}
                        onDeclareWinner={(betId, winnerId) => {
                          console.log('Declare winner:', betId, winnerId);
                        }}
                        onDelete={async (betId) => {
                          console.log('Delete bet:', betId);
                        }}
                      />
                    </div>
                  ))}
                  {filteredAndSortedBets.length > 5 && (
                    <button
                      onClick={() => setShowAllBets(!showAllBets)}
                      style={{
                        display: "block",
                        margin: "16px auto 0",
                        fontSize: "12px",
                        color: "#FF6B35",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      {showAllBets ? "Show Less" : `Show All (${filteredAndSortedBets.length})`}
                    </button>
                  )}
                </div>
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#71717A",
                    marginTop: "24px",
                  }}
                >
                  {betSearchQuery.trim()
                    ? `No bets found for "${betSearchQuery}"`
                    : getEmptyStateMessage(mapFilterToTab(activeFilter) as any)}
                </p>
              )}
            </>
          )}
        </section>

        {/* MY GROUPS Section */}
        <section style={{ marginTop: "32px" }}>
          <SectionTitle>MY GROUPS</SectionTitle>

          {/* Groups Search Bar */}
          <SearchBar
            value={groupSearchQuery}
            onChange={setGroupSearchQuery}
            placeholder="Search Groups..."
          />

          {/* Group Cards */}
          <div style={{ padding: "0 16px" }}>
            {loading ? (
              <div>
                {[...Array(2)].map((_, i) => (
                  <GroupCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {filteredAndSortedGroups.length > 0 ? (
                  <div>
                    {filteredAndSortedGroups.map((group) => (
                      <FeedGroupCard
                        key={group.id}
                        group={group}
                        activeBets={getActiveBetCount(bets, group.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#71717A",
                      marginTop: "24px",
                    }}
                  >
                    {groupSearchQuery.trim()
                      ? `No groups found for "${groupSearchQuery}"`
                      : "You haven't joined any groups yet."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </main>

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
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 p-4"
          onClick={() => setShowCreateBet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-5"
          >
            <Suspense fallback={null}>
              <CreateBetWizard
                user={user}
                onClose={() => setShowCreateBet(false)}
              />
            </Suspense>
          </div>
        </div>
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

                    // Update group with new member
                    await updateDoc(groupRef, {
                      memberIds: [...(groupData.memberIds || []), user.uid],
                    });

                    // Get user's display name
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    const userData = userDoc.data();
                    const userName = userData?.displayName ||
                                    `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                                    user.email ||
                                    "Unknown User";

                    // Create activity for user joining
                    await createActivity({
                      groupId: matchSnap.id,
                      type: "user_joined",
                      userId: user.uid,
                      userName: userName
                    });

                    // Check for milestone
                    const newMemberCount = (groupData.memberIds || []).length + 1;
                    if (newMemberCount === 5 || newMemberCount === 10 || newMemberCount === 20) {
                      await createActivity({
                        groupId: matchSnap.id,
                        type: "milestone",
                        userId: "group_system",
                        userName: "Group",
                        milestoneCount: newMemberCount
                      });
                    }

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

      <FloatingCreateBetButton
        groups={groups}
        onCreateBet={handleCreateBet}
      />
    </div>
  );
}
