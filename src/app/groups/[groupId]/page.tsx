"use client";

import { useEffect, useState, useMemo } from "react";
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
  getDocs,
  addDoc,
  limit,
  documentId,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import JudgeBetModal from "../../../components/JudgeBetModal";
import { GroupBetCard } from "../../../components/bets/GroupBetCard";
import ArchivedBetCard from "../../../components/ArchivedBetCard";
import Footer from "../../../components/Footer";
import BetFilters, { FilterTab, SortOption } from "../../../components/BetFilters";
import { SeeMoreButton } from "../../../components/ui/SeeMoreButton";
import ActivityFeed from "../../../components/ActivityFeed";
import { getTimeRemaining } from "../../../utils/timeUtils";
import { filterBets, sortBets, getEmptyStateMessage, searchBets } from "../../../utils/betFilters";
import { removeUserFromGroupBets } from "../../../utils/groupHelpers";
import { createActivity } from "../../../lib/activityHelpers";
import { LogOut, X, Trash2 } from "lucide-react";

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
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loadingUserNames, setLoadingUserNames] = useState(false);

  // Filter and sort state
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("closingSoon");
  const [searchQuery, setSearchQuery] = useState("");

  // Active bets pagination state
  const [activeExpanded, setActiveExpanded] = useState(false);
  const [activeDisplayCount, setActiveDisplayCount] = useState(3);

  // Leave Group state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Delete Group state
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      alert("Failed to place bet. Please try again.");
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

      alert("✅ Bet created successfully!");
    } catch (err) {
      console.error("Error creating bet:", err);
      alert("Failed to create bet. Please try again.");
    }
  };

  // Leave Group Handler
  const handleLeaveGroup = async () => {
    if (isLeaving || !user) return;

    try {
      setIsLeaving(true);

      // Step 1: Get user's display name
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const userName = userData?.displayName ||
                      `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                      user.email ||
                      "Unknown User";

      // Step 2: Remove user's picks from all group bets
      await removeUserFromGroupBets(groupId as string, user.uid);

      // Step 3: Remove user from group's memberIds array
      const groupRef = doc(db, "groups", groupId as string);
      await updateDoc(groupRef, {
        memberIds: arrayRemove(user.uid),
      });

      // Step 4: Create activity
      await createActivity({
        groupId: groupId as string,
        type: "user_left",
        userId: user.uid,
        userName: userName
      });

      // Success feedback
      alert("✅ You've left the group");

      // Redirect to home page
      router.push("/home");
    } catch (error: any) {
      console.error("Error leaving group:", error);
      alert(`Failed to leave group: ${error.message}`);
    } finally {
      setIsLeaving(false);
      setShowLeaveModal(false);
    }
  };

  /**
   * Delete all bets in the group
   */
  const deleteAllGroupBets = async (groupId: string) => {
    try {
      // Query all bets in this group
      const betsQuery = query(
        collection(db, "bets"),
        where("groupId", "==", groupId)
      );

      const betsSnapshot = await getDocs(betsQuery);

      console.log(`Found ${betsSnapshot.docs.length} bets to delete`);

      // Delete each bet
      const deletePromises = betsSnapshot.docs.map(async (betDoc) => {
        return deleteDoc(doc(db, "bets", betDoc.id));
      });

      await Promise.all(deletePromises);

      console.log(`Deleted ${betsSnapshot.docs.length} bets`);

    } catch (error) {
      console.error("Error deleting group bets:", error);
      throw error;
    }
  };

  /**
   * Delete the group and all its bets
   */
  const handleDeleteGroup = async () => {
    if (isDeleting || !user || !group) return;

    try {
      setIsDeleting(true);

      // Step 1: Delete all bets in the group
      await deleteAllGroupBets(group.id);

      // Step 2: Delete the group itself
      const groupRef = doc(db, "groups", group.id);
      await deleteDoc(groupRef);

      alert(`✅ ${group.name} has been deleted`);

      // Step 3: Redirect to home page
      router.push("/home");

    } catch (error: any) {
      console.error("Error deleting group:", error);
      alert(`Failed to delete group: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteGroupModal(false);
    }
  };

  // Handler for See More / See Less pagination
  const handleActiveSeeMore = () => {
    if (activeExpanded) {
      // Collapse back to 3
      setActiveExpanded(false);
      setActiveDisplayCount(3);
    } else {
      // Expand by 3 more
      setActiveDisplayCount(prev => prev + 3);
      setActiveExpanded(true);
    }
  };

  // Reset display count when filters change
  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setActiveDisplayCount(3);
    setActiveExpanded(false);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setActiveDisplayCount(3);
    setActiveExpanded(false);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setActiveDisplayCount(3);
    setActiveExpanded(false);
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

  // 👥 Batch fetch user names for leaderboard
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const fetchUserNames = async () => {
      setLoadingUserNames(true);
      try {
        // Extract unique user IDs from leaderboard
        const userIds = Array.from(
          new Set(leaderboard.map((l) => l.user_id).filter(Boolean))
        );

        if (userIds.length === 0) {
          setLoadingUserNames(false);
          return;
        }

        // Firestore 'in' queries support max 30 items, so we batch if needed
        const batchSize = 30;
        const userDataMap: Record<string, string> = {};

        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          const usersQuery = query(
            collection(db, "users"),
            where(documentId(), "in", batch)
          );

          const usersSnapshot = await getDocs(usersQuery);

          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            const uid = doc.id;

            // Display priority: displayName > firstName lastName > email > "Unknown User"
            if (userData.displayName) {
              userDataMap[uid] = userData.displayName;
            } else if (userData.firstName || userData.lastName) {
              const firstName = userData.firstName || "";
              const lastName = userData.lastName || "";
              userDataMap[uid] = `${firstName} ${lastName}`.trim();
            } else if (userData.email) {
              userDataMap[uid] = userData.email;
            } else {
              userDataMap[uid] = "Unknown User";
            }
          });
        }

        // For any user IDs that weren't found in the users collection
        userIds.forEach((uid) => {
          if (!userDataMap[uid]) {
            userDataMap[uid] = "Unknown User";
          }
        });

        setUserNames(userDataMap);
      } catch (error) {
        console.error("Error fetching user names:", error);
      } finally {
        setLoadingUserNames(false);
      }
    };

    fetchUserNames();
  }, [leaderboard]);

  // 🚫 Prevent body scroll when modal open
  useEffect(() => {
    if (showLeaveModal || showDeleteGroupModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showLeaveModal, showDeleteGroupModal]);

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

  const activeBets = bets.filter((b) => b.status !== "JUDGED");
  const archivedBets = bets.filter((b) => b.status === "JUDGED");

  // Apply filters and sorting to active bets
  const filteredAndSortedBets = useMemo(() => {
    if (!user) return [];
    // 1. Filter by active tab
    const tabFiltered = filterBets(activeBets, activeTab, user.uid);
    // 2. Apply search filter
    const searchFiltered = searchBets(tabFiltered, searchQuery);
    // 3. Apply sort
    const sorted = sortBets(searchFiltered, sortBy);
    return sorted;
  }, [activeBets, activeTab, searchQuery, sortBy, user]);

  // Determine what to display based on pagination
  const activeBetsToShow = useMemo(() => {
    return filteredAndSortedBets.slice(0, activeDisplayCount);
  }, [filteredAndSortedBets, activeDisplayCount]);

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

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pb-16 sm:pb-20 pt-20 relative overflow-y-auto">
      <div className="w-full max-w-2xl px-4">
        {/* 🧩 GROUP INFO */}
        <section className="w-full mt-6 px-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>

              {group.tagline && (
                <p className="text-sm text-gray-400 mt-1">{group.tagline}</p>
              )}
            </div>

            {/* Delete Group Button - Admin Only */}
            {group.admin_id === user.uid && (
              <button
                onClick={() => setShowDeleteGroupModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Delete Group</span>
                <span className="sm:hidden">Delete</span>
              </button>
            )}

            {/* Leave Group Button - Non-Admin Members */}
            {group.memberIds?.includes(user.uid) && group.admin_id !== user.uid && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Leave Group</span>
                <span className="sm:hidden">Leave</span>
              </button>
            )}
          </div>

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
        </section>

        {/* 🔶 ACTIVITY FEED */}
        <div className="mt-6">
          <ActivityFeed groupId={group.id} groupName={group.name} />
        </div>

        {/* 🎯 ACTIVE BETS */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3 text-white text-left">
            Active Bets
          </h2>

          {activeBets.length > 0 ? (
            <>
              {/* Bet Filters - Tabs, Search, and Sort (no Group sort for group details) */}
              <BetFilters
                bets={activeBets}
                userId={user.uid}
                activeTab={activeTab}
                sortBy={sortBy}
                onTabChange={handleTabChange}
                onSortChange={handleSortChange}
                showGroupSort={false}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
              />

              {/* Filtered and Sorted Bets */}
              {activeBetsToShow.length > 0 ? (
                <ul className="space-y-4 w-full mt-4">
                  {activeBetsToShow.map((bet: any) => (
                    <li key={bet.id}>
                      <GroupBetCard
                        bet={bet}
                        currentUserId={user?.uid || ''}
                        groupName={bet.isH2H ? undefined : group.name}
                        onVote={(betId, vote) => {
                          const targetBet = bets.find(b => b.id === betId);
                          if (targetBet) handleUserPick(targetBet, vote);
                        }}
                        onSubmitGuess={(betId, guess) => {
                          const targetBet = bets.find(b => b.id === betId);
                          if (targetBet) handleUserPick(targetBet, guess);
                        }}
                        onChangeVote={(betId) => console.log('Change vote:', betId)}
                        onJudge={(betId, result) => setJudgingBet(bet)}
                        onDeclareWinner={(betId, winnerId) => console.log('Declare winner:', betId, winnerId)}
                        onDelete={async (betId) => console.log('Delete bet:', betId)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center mt-4">
                  {searchQuery.trim() ? (
                    <>
                      <p className="text-zinc-400 text-sm">
                        No bets found for "{searchQuery}"
                      </p>
                      <button
                        onClick={() => handleSearchChange("")}
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

              {/* SEE MORE Button */}
              <SeeMoreButton
                expanded={activeExpanded}
                onClick={handleActiveSeeMore}
                hasMore={filteredAndSortedBets.length > activeBetsToShow.length}
              />
            </>
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
                {loadingUserNames && leaderboard.length > 0 ? (
                  <p className="text-gray-400 text-sm text-center py-2">
                    Loading user names...
                  </p>
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((leaderUser, i) => {
                    const displayName = userNames[leaderUser.user_id] || "Loading...";

                    return (
                      <motion.div
                        key={leaderUser.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 mb-2 last:border-none last:mb-0"
                      >
                        <span className="font-medium text-white">
                          #{i + 1} {displayName}
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
                    );
                  })
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

      {/* Leave Group Confirmation Modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm w-full relative z-[61] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <h3 className="text-lg font-semibold text-white mb-3">
              Leave Group?
            </h3>

            {/* Content */}
            <p className="text-sm text-zinc-400 mb-2">
              Are you sure you want to leave "
              <span className="text-white font-medium">{group.name}</span>"?
            </p>

            <p className="text-sm text-zinc-400 mb-4">
              You'll be removed from all bets in this group and lose access to group
              activity.
            </p>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-500">
                ⚠️ Your picks will be removed from active bets in this group.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleLeaveGroup}
                disabled={isLeaving}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isLeaving ? "Leaving..." : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowDeleteGroupModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm w-full relative z-[61] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDeleteGroupModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <h3 className="text-lg font-semibold text-white mb-3">
              Delete Group?
            </h3>

            <p className="text-sm text-zinc-400 mb-2">
              Are you sure you want to permanently delete "<span className="text-white font-medium">{group?.name}</span>"?
            </p>

            <p className="text-sm text-zinc-400 mb-4">
              This will delete the group and all {group?.memberIds?.length || 0} member(s) will be removed.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-500 font-medium">
                ⚠️ Warning: All bets in this group will be permanently deleted. This action cannot be undone.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGroupModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteGroup}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}