"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Bell } from 'lucide-react';
import ActiveBetCard from '@/components/ActiveBetCard';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Bets and filters
  const [bets, setBets] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'MY_PICKS' | 'PENDING' | 'SOON'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateBet, setShowCreateBet] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load bets
  useEffect(() => {
    if (!user) return;

    // Get user's groups first
    const loadBets = async () => {
      try {
        // Get user's groups
        const groupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', user.uid)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const userGroupIds = groupsSnapshot.docs.map(doc => doc.id);

        // Listen to bets from those groups or where user is participant
        const betsQuery = query(collection(db, 'bets'));
        
        const unsubscribe = onSnapshot(betsQuery, (snapshot) => {
          const betsData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((bet: any) => {
              // Include if bet is in user's group or user is a participant
              return userGroupIds.includes(bet.groupId) || 
                     bet.participants?.includes(user.uid) ||
                     bet.friendId === user.uid ||
                     bet.creatorId === user.uid;
            });
          
          setBets(betsData);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading bets:', error);
      }
    };

    loadBets();
  }, [user]);

  // Filter and sort bets
  const filteredAndSortedBets = useMemo(() => {
    let filtered = [...bets];

    // Apply filter
    if (activeFilter === 'OPEN') {
      filtered = filtered.filter(bet => bet.status === 'OPEN');
    } else if (activeFilter === 'MY_PICKS') {
      filtered = filtered.filter(bet => bet.picks?.[user?.uid]);
    } else if (activeFilter === 'PENDING') {
      filtered = filtered.filter(bet => bet.status === 'CLOSED' || bet.status === 'PENDING');
    } else if (activeFilter === 'SOON') {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const now = Date.now();
      filtered = filtered.filter(bet => {
        if (!bet.closingAt) return false;
        const closingTime = new Date(bet.closingAt).getTime();
        return (closingTime - now) <= twentyFourHours && (closingTime - now) > 0;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bet => 
        bet.title?.toLowerCase().includes(query) ||
        bet.description?.toLowerCase().includes(query) ||
        bet.groupName?.toLowerCase().includes(query)
      );
    }

    // Sort: Priority 1 = closing <1hr, Priority 2 = pot size
    filtered.sort((a, b) => {
      const aClosingTime = new Date(a.closingAt).getTime();
      const bClosingTime = new Date(b.closingAt).getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      const aClosingSoon = (aClosingTime - now) <= oneHour && (aClosingTime - now) > 0;
      const bClosingSoon = (bClosingTime - now) <= oneHour && (bClosingTime - now) > 0;

      // Priority 1: Closing soon bets first
      if (aClosingSoon && !bClosingSoon) return -1;
      if (!aClosingSoon && bClosingSoon) return 1;
      
      // If both closing soon, sort by closing time
      if (aClosingSoon && bClosingSoon) {
        return aClosingTime - bClosingTime;
      }

      // Priority 2: Sort by pot size (largest first)
      return (b.totalPot || 0) - (a.totalPot || 0);
    });

    return filtered;
  }, [bets, activeFilter, searchQuery, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-white text-[18px] font-bold font-montserrat tracking-wider">
            SIDEBET
          </h1>
          <div className="flex items-center gap-4">
            <button className="text-white hover:text-[#ff6b35] transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                await auth.signOut();
                router.push('/login');
              }}
              className="text-[10px] font-semibold text-white/60 hover:text-white transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 px-6">
        {/* Filter Pills */}
        <div className="flex gap-2 py-2 overflow-x-auto scrollbar-hide mb-4">
          {(['ALL', 'OPEN', 'MY_PICKS', 'PENDING', 'SOON'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                px-4 py-1 rounded-md border-2 border-[#ff6b35] flex-shrink-0
                font-montserrat font-semibold text-[10px] transition-colors
                ${activeFilter === filter 
                  ? 'bg-[#ff6b35] text-white' 
                  : 'bg-transparent text-white hover:bg-[#ff6b35]/10'}
              `}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff6b35]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Bets..."
            className="w-full pl-10 pr-3 py-2 bg-[#1e1e1e] rounded-md text-white placeholder-[#b3b3b3] text-[12px] font-montserrat font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
          />
        </div>

        {/* Bets List or Empty State */}
        {filteredAndSortedBets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/50 text-[14px] font-montserrat italic">
              No Active Bets. Create One, Chump!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAndSortedBets.map(bet => (
              <ActiveBetCard
                key={bet.id}
                bet={bet}
                currentUserId={user.uid}
                onVote={async (pick) => {
                  // TODO: Implement vote handler
                  console.log('Vote:', pick);
                }}
                onAcceptH2H={async (pick) => {
                  // TODO: Implement H2H accept handler
                  console.log('Accept H2H:', pick);
                }}
                onDeclineH2H={async () => {
                  // TODO: Implement H2H decline handler
                  console.log('Decline H2H');
                }}
                onJudge={async (result) => {
                  // TODO: Implement judge handler
                  console.log('Judge:', result);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE BET Floating Button */}
      <button
        onClick={() => setShowCreateBet(true)}
        className="fixed bottom-[84px] right-6 z-40 px-6 py-2 h-9 bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)] text-white text-[10px] font-semibold font-montserrat rounded-md shadow-lg shadow-[#ff6b35]/30 transition-colors"
      >
        CREATE BET
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-zinc-800">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/home')}
            className="flex flex-col items-center justify-center gap-1 text-[#ff6b35]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Home</span>
          </button>

          <button 
            onClick={() => router.push('/groups')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Groups</span>
          </button>

          <button 
            onClick={() => router.push('/friends')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Friends</span>
          </button>

          <button 
            onClick={() => router.push('/settle')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Settle</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
