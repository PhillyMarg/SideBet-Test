"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Search } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ActiveBetCard from '@/components/ActiveBetCard';
import CreateBetWizard from '@/components/CreateBetWizard';

type FilterType = 'ALL' | 'OPEN' | 'MY PICKS' | 'PENDING' | 'SOON';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bets, setBets] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreateBetWizard, setShowCreateBetWizard] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
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
        console.error('Error fetching user data:', error);
        setUser(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  // Fetch user's groups
  useEffect(() => {
    if (!user) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch all bets from user's groups
  useEffect(() => {
    if (!user || groups.length === 0) {
      setBets([]);
      return;
    }

    const groupIds = groups.map(g => g.id);

    // Firestore 'in' query has a limit of 10, so we need to batch if more groups
    if (groupIds.length === 0) {
      setBets([]);
      return;
    }

    // For simplicity, take first 10 groups (you can implement batching if needed)
    const limitedGroupIds = groupIds.slice(0, 10);

    const betsQuery = query(
      collection(db, 'bets'),
      where('groupId', 'in', limitedGroupIds)
    );

    const unsubscribe = onSnapshot(betsQuery, (snapshot) => {
      const betsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBets(betsData);
    });

    return () => unsubscribe();
  }, [user, groups]);

  // Filter and sort bets
  const filteredAndSortedBets = useMemo(() => {
    if (!user) return [];

    let filtered = bets;

    // Apply filter
    switch (activeFilter) {
      case 'OPEN':
        filtered = filtered.filter(bet => bet.status === 'OPEN');
        break;
      case 'MY PICKS':
        filtered = filtered.filter(bet => bet.picks?.[user.uid]);
        break;
      case 'PENDING':
        filtered = filtered.filter(bet => bet.status === 'CLOSED');
        break;
      case 'SOON':
        const now = Date.now();
        const oneDayFromNow = now + (24 * 60 * 60 * 1000);
        filtered = filtered.filter(bet => {
          if (!bet.closingAt) return false;
          const closingTime = new Date(bet.closingAt).getTime();
          return closingTime > now && closingTime <= oneDayFromNow;
        });
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(bet =>
        bet.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by priority
    return filtered.sort((a, b) => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      const aClosingTime = new Date(a.closingAt).getTime();
      const bClosingTime = new Date(b.closingAt).getTime();

      const aClosingSoon = (aClosingTime - now) <= oneHour && (aClosingTime - now) > 0;
      const bClosingSoon = (bClosingTime - now) <= oneHour && (bClosingTime - now) > 0;

      // Priority 1: Closing soon bets first
      if (aClosingSoon && !bClosingSoon) return -1;
      if (!aClosingSoon && bClosingSoon) return 1;

      // Within closing soon group, sort by time
      if (aClosingSoon && bClosingSoon) {
        return aClosingTime - bClosingTime;
      }

      // Priority 2: Sort by pot size
      const aPot = a.totalPot || 0;
      const bPot = b.totalPot || 0;
      if (aPot !== bPot) {
        return bPot - aPot;
      }

      // Tie-breaker: closing time
      return aClosingTime - bClosingTime;
    });
  }, [bets, activeFilter, searchQuery, user]);

  // Get group name for a bet
  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Group';
  };

  // Add group name to bets for ActiveBetCard
  const betsWithGroupNames = useMemo(() => {
    return filteredAndSortedBets.map(bet => ({
      ...bet,
      groupName: getGroupName(bet.groupId)
    }));
  }, [filteredAndSortedBets, groups]);

  // Handle bet pick
  const handleBetPick = async (bet: any, pick: string | number) => {
    // This will be handled by ActiveBetCard internally
    console.log('Pick made:', bet.id, pick);
  };

  // Handle judge bet
  const handleJudgeBet = (bet: any) => {
    console.log('Judge bet:', bet.id);
    // You can implement judge modal here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const filters: FilterType[] = ['ALL', 'OPEN', 'MY PICKS', 'PENDING', 'SOON'];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <Header userId={user?.uid} />

      {/* Main Content */}
      <main className="pt-14 pb-24">

        {/* Filter Pills */}
        <div className="flex gap-2 px-6 py-2 overflow-x-auto scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                px-4 py-1 rounded-md font-montserrat font-semibold text-[10px] whitespace-nowrap
                border-2 border-[#ff6b35] transition-all flex-shrink-0
                ${activeFilter === filter
                  ? 'bg-[#ff6b35] text-white'
                  : 'bg-transparent text-white hover:bg-[#ff6b35]/10'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2">
          <div className="bg-[#1e1e1e] rounded-md px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#ff6b35] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search Bets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                flex-1 bg-transparent border-none outline-none
                text-[#b3b3b3] placeholder:text-[#b3b3b3]
                font-montserrat font-semibold text-[12px]
              "
            />
          </div>
        </div>

        {/* Bet Cards List */}
        <div className="px-6 flex flex-col gap-4 mt-4">
          {betsWithGroupNames.length === 0 ? (
            <div className="text-center text-white/50 py-12">
              <p className="font-montserrat">
                {searchQuery ? 'No bets found' : 'No active bets'}
              </p>
            </div>
          ) : (
            betsWithGroupNames.map((bet) => (
              <ActiveBetCard
                key={bet.id}
                bet={bet}
                user={user}
                onPick={handleBetPick}
                onJudge={handleJudgeBet}
                groupName={bet.groupName}
              />
            ))
          )}
        </div>

      </main>

      {/* CREATE BET Floating Button */}
      <button
        onClick={() => setShowCreateBetWizard(true)}
        className="
          fixed bottom-[84px] right-6 z-40
          bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)]
          px-6 py-2 rounded-md h-9
          shadow-lg shadow-[#ff6b35]/30
          transition-all
        "
      >
        <span className="font-montserrat font-semibold text-[10px] text-white whitespace-nowrap">
          CREATE BET
        </span>
      </button>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      {showCreateBetWizard && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 p-4"
          onClick={() => setShowCreateBetWizard(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-5"
          >
            <CreateBetWizard
              user={user}
              onClose={() => setShowCreateBetWizard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
