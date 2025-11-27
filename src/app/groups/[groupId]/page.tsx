"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Bell, ChevronLeft, Copy, X } from 'lucide-react';
import ActiveBetCard from '@/components/ActiveBetCard';
import CreateBetWizard from '@/components/CreateBetWizard';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'MY_PICKS' | 'PENDING' | 'SOON'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(true);
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

  // Load group details
  useEffect(() => {
    if (!groupId) return;

    const loadGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() });
        }
      } catch (error) {
        console.error('Error loading group:', error);
      }
    };

    loadGroup();
  }, [groupId]);

  // Load group bets
  useEffect(() => {
    if (!groupId) return;

    const betsQuery = query(
      collection(db, 'bets'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(betsQuery, (snapshot) => {
      const betsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure required properties exist with defaults
          creatorId: data.creatorId || '',
          totalPot: data.totalPot || 0,
          participants: data.participants || [],
          wagerAmount: data.wagerAmount || 0,
        };
      });
      setBets(betsData);
    });

    return () => unsubscribe();
  }, [groupId]);

  // Filter and sort bets (same logic as home page)
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
        bet.description?.toLowerCase().includes(query)
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

      if (aClosingSoon && !bClosingSoon) return -1;
      if (!aClosingSoon && bClosingSoon) return 1;
      if (aClosingSoon && bClosingSoon) {
        return aClosingTime - bClosingTime;
      }

      return (b.totalPot || 0) - (a.totalPot || 0);
    });

    return filtered;
  }, [bets, activeFilter, searchQuery, user]);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white">Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="text-white hover:text-[#ff6b35] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white text-[18px] font-bold font-montserrat tracking-wider">
              SIDEBET
            </h1>
          </div>
          <button className="text-white hover:text-[#ff6b35] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 px-6">
        {/* Group Info Card */}
        {showGroupInfo && (
          <div className="bg-zinc-900/40 border-2 border-[#ff6b35] rounded-md p-4 mb-6 relative">
            <button
              onClick={() => setShowGroupInfo(false)}
              className="absolute top-2 right-2 text-[#ff6b35] hover:text-[#ff8c5c] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-white text-[16px] font-bold font-montserrat mb-2">
              {group.name}
            </h2>

            {group.description && (
              <p className="text-white/70 text-[12px] font-montserrat mb-2">
                {group.description}
              </p>
            )}

            <div className="space-y-1 mb-2">
              <p className="text-white/70 text-[10px] font-montserrat">
                Group Creator: <span className="text-[#ff6b35]">{group.creatorName || 'Unknown'}</span>
              </p>
              
              <div className="flex items-center gap-2">
                <p className="text-white/70 text-[10px] font-montserrat">
                  Invite Code: <span className="text-[#ff6b35]">{group.inviteCode || 'XTV13W'}</span>
                </p>
                <button
                  onClick={() => copyToClipboard(group.inviteCode || 'XTV13W')}
                  className="text-[#ff6b35] hover:text-[#ff8c5c] transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-white/70 text-[10px] font-montserrat">
                  Invite Link: <span className="text-[#ff6b35]">Copy</span>
                </p>
                <button
                  onClick={() => copyToClipboard(`https://sidebet.app/join/${group.inviteCode || 'XTV13W'}`)}
                  className="text-[#ff6b35] hover:text-[#ff8c5c] transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-2 mt-2">
              <p className="text-white text-[12px] font-semibold font-montserrat">
                Wager Limit: ${group.minBet?.toFixed(2) || '1.00'} - ${group.maxBet?.toFixed(2) || '5.00'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-white text-[10px] font-montserrat">{group.memberIds?.length || 8} Players</span>
              </div>
            </div>
          </div>
        )}

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
                  if (!user) return;

                  try {
                    const betRef = doc(db, 'bets', bet.id);
                    await updateDoc(betRef, {
                      [`picks.${user.uid}`]: pick,
                      participants: arrayUnion(user.uid),
                    });

                    console.log('Vote submitted successfully');
                    // TODO: Add success toast notification
                  } catch (error) {
                    console.error('Error submitting vote:', error);
                    alert('Failed to submit vote. Please try again.');
                  }
                }}
                onJudge={async (result) => {
                  if (!user) return;

                  try {
                    const betRef = doc(db, 'bets', bet.id);
                    const betDoc = await getDoc(betRef);

                    if (!betDoc.exists()) {
                      alert('Bet not found');
                      return;
                    }

                    const betData = betDoc.data();
                    const picks = betData.picks || {};
                    const betType = betData.type;

                    let winnerId: string | null = null;
                    let status = 'CLOSED';
                    let voidReason: string | undefined = undefined;

                    // Determine winner based on bet type
                    if (betType === 'YES_NO') {
                      // Find users who picked the winning answer
                      const winners = Object.entries(picks).filter(([_, pick]) => pick === result);

                      if (winners.length === 0) {
                        // No one voted for the winning answer
                        status = 'VOID';
                        voidReason = 'NO_VOTES';
                      } else if (winners.length === 1) {
                        winnerId = winners[0][0];
                      } else {
                        // Multiple winners - tie
                        status = 'VOID';
                        voidReason = 'TIE';
                      }
                    } else if (betType === 'OVER_UNDER') {
                      const numResult = typeof result === 'string' ? parseFloat(result) : result;
                      const line = betData.line;

                      if (isNaN(numResult)) {
                        alert('Please enter a valid number');
                        return;
                      }

                      const correctPick = numResult > line ? 'OVER' : numResult < line ? 'UNDER' : 'PUSH';

                      if (correctPick === 'PUSH') {
                        status = 'VOID';
                        voidReason = 'TIE';
                      } else {
                        const winners = Object.entries(picks).filter(([_, pick]) => pick === correctPick);

                        if (winners.length === 0) {
                          status = 'VOID';
                          voidReason = 'NO_VOTES';
                        } else if (winners.length === 1) {
                          winnerId = winners[0][0];
                        } else {
                          status = 'VOID';
                          voidReason = 'TIE';
                        }
                      }
                    }

                    // Update bet with result
                    const updateData: any = {
                      status: status,
                      result: result,
                    };

                    if (winnerId) {
                      updateData.winnerId = winnerId;
                    }

                    if (voidReason) {
                      updateData.voidReason = voidReason;
                    }

                    await updateDoc(betRef, updateData);

                    console.log('Bet judged successfully');
                    // TODO: Add success toast notification
                  } catch (error) {
                    console.error('Error judging bet:', error);
                    alert('Failed to judge bet. Please try again.');
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE BET Floating Button */}
      <button
        onClick={() => setShowCreateBet(true)}
        className="fixed bottom-[84px] right-6 z-40 px-6 py-2 h-9 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[10px] font-semibold font-montserrat rounded-md shadow-lg shadow-[#ff6b35]/30 transition-colors"
      >
        CREATE BET
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-zinc-800">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/home')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Home</span>
          </button>

          <button 
            onClick={() => router.push('/groups')}
            className="flex flex-col items-center justify-center gap-1 text-[#ff6b35]"
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

      {/* Create Bet Wizard */}
      {showCreateBet && (
        <CreateBetWizard
          onClose={() => setShowCreateBet(false)}
          user={auth.currentUser}
          preselectedGroupId={groupId}
        />
      )}
    </div>
  );
}
