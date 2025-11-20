"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../lib/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { GroupBetCard, determineCardState } from "../../components/bets/GroupBetCard";
import { SeeMoreButton } from "../../components/ui/SeeMoreButton";
import { ArchivedFilterTabs } from "../../components/home/ArchivedFilterTabs";
import BetCardSkeleton from "../../components/BetCardSkeleton";
import { searchBets } from "../../utils/betFilters";

// Import the Figma design components
import { Header } from "../../components/layout/Header";
import { SearchBar } from "../../components/home/SearchBar";
import { SectionTitle } from "../../components/home/SectionTitle";

export default function PastBetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and search state
  const [filterSelected, setFilterSelected] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [displayCount, setDisplayCount] = useState(3);

  // Auth + Firestore listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      // Fetch complete user profile from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const completeUser = {
            ...firebaseUser,
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: userData.displayName,
          } as any;
          setUser(completeUser);
        } else {
          setUser(firebaseUser);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(firebaseUser);
      }

      const uid = firebaseUser.uid;

      // Real-time listener for groups
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", uid),
        limit(50)
      );
      const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
        const groupsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
      });

      // Real-time listeners for bets
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
      const betsH2HChallengeQuery = query(
        collection(db, "bets"),
        where("challengeeId", "==", uid),
        limit(50)
      );

      const unsubCreated = onSnapshot(betsCreatedQuery, (snapshot) => {
        const created = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !created.some((c) => c.id === b.id)),
            ...created,
          ];
        });
        setLoading(false);
      });

      const unsubJoined = onSnapshot(betsJoinedQuery, (snapshot) => {
        const joined = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !joined.some((j) => j.id === b.id)),
            ...joined,
          ];
        });
      });

      const unsubH2HChallenges = onSnapshot(betsH2HChallengeQuery, (snapshot) => {
        const h2hChallenges = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          return [
            ...prev.filter((b) => !h2hChallenges.some((h) => h.id === b.id)),
            ...h2hChallenges,
          ];
        });
      });

      // Cleanup all listeners
      return () => {
        unsubGroups();
        unsubCreated();
        unsubJoined();
        unsubH2HChallenges();
      };
    });

    return () => unsubAuth();
  }, [router]);

  // Filter for archived bets only (WON/LOST)
  const archivedBets = useMemo(() => {
    if (!user) return [];

    return bets.filter(bet => {
      const state = determineCardState(bet, user.uid);
      return ['WON', 'LOST'].includes(state);
    });
  }, [bets, user]);

  // Filter and sort archived bets
  const filteredAndSortedBets = useMemo(() => {
    if (!user) return [];

    // 1. Apply filter
    let filtered = archivedBets;

    if (filterSelected === 'WON') {
      filtered = archivedBets.filter(bet => determineCardState(bet, user.uid) === 'WON');
    } else if (filterSelected === 'LOST') {
      filtered = archivedBets.filter(bet => determineCardState(bet, user.uid) === 'LOST');
    } else if (filterSelected === 'H2H') {
      filtered = archivedBets.filter(bet => bet.isH2H || bet.playerCount === 2);
    }

    // 2. Apply search
    const searchFiltered = searchBets(filtered, searchQuery);

    // 3. Sort by most recently judged first
    const sorted = [...searchFiltered].sort((a, b) => {
      const aTime = new Date(a.judgedAt || a.closingAt || 0).getTime();
      const bTime = new Date(b.judgedAt || b.closingAt || 0).getTime();
      return bTime - aTime;
    });

    return sorted;
  }, [archivedBets, filterSelected, searchQuery, user]);

  // Determine what to display based on pagination
  const betsToShow = useMemo(() => {
    return filteredAndSortedBets.slice(0, displayCount);
  }, [filteredAndSortedBets, displayCount]);

  // Handlers
  const handleSeeMore = () => {
    if (expanded) {
      // Collapse back to 3
      setExpanded(false);
      setDisplayCount(3);
    } else {
      // Expand by 3 more
      setDisplayCount(prev => prev + 3);
      setExpanded(true);
    }
  };

  const handleFilterChange = (filter: string) => {
    setFilterSelected(filter);
    setDisplayCount(3);
    setExpanded(false);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setDisplayCount(3);
    setExpanded(false);
  };

  const getGroupName = (groupId: string) =>
    groups.find((g) => g.id === groupId)?.name || "Unknown Group";

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
        {/* ============ PAST BETS SECTION ============ */}
        <SectionTitle>PAST BETS</SectionTitle>

        {/* Filter Tabs */}
        <ArchivedFilterTabs
          selected={filterSelected}
          onSelect={handleFilterChange}
        />

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search Past Bets..."
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
              {betsToShow.length > 0 ? (
                <div>
                  {betsToShow.map((bet) => (
                    <div key={bet.id} style={{ marginBottom: "12px" }}>
                      <GroupBetCard
                        bet={bet}
                        currentUserId={user?.uid || ''}
                        groupName={getGroupName(bet.groupId)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "48px",
                    padding: "0 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#71717A",
                      marginBottom: "8px",
                    }}
                  >
                    No past bets found
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#52525B",
                    }}
                  >
                    {searchQuery || filterSelected !== 'ALL'
                      ? 'Try adjusting your filters or search'
                      : 'Your completed bets will appear here'
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* SEE MORE Button */}
        {!loading && (
          <SeeMoreButton
            expanded={expanded}
            onClick={handleSeeMore}
            hasMore={filteredAndSortedBets.length > betsToShow.length}
          />
        )}
      </main>
    </div>
  );
}
