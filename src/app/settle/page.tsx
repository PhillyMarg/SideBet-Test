"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Bell } from 'lucide-react';
import SettlePersonCard from '@/components/SettlePersonCard';
import ActiveBetCard from '@/components/ActiveBetCard';

type TabType = 'BALANCE' | 'JUDGE' | 'HISTORY';

export default function SettlePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>('BALANCE');
  const [searchQuery, setSearchQuery] = useState('');
  const [bets, setBets] = useState<any[]>([]);
  const [settledBalances, setSettledBalances] = useState<any[]>([]);

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

  // Load bets for all tabs
  useEffect(() => {
    if (!user) return;

    const betsQuery = query(collection(db, 'bets'));
    
    const unsubscribe = onSnapshot(betsQuery, (snapshot) => {
      const betsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((bet: any) => {
          // Include bets where user is a participant
          return bet.participants?.includes(user.uid) ||
                 bet.friendId === user.uid ||
                 bet.creatorId === user.uid;
        });
      
      setBets(betsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate balances for BALANCE tab
  const balanceData = useMemo(() => {
    if (!user || !bets.length) return { owedToYou: [], youOwe: [], netBalance: 0 };

    // Group balances by person
    const balances: { [personId: string]: { name: string; amount: number; bets: any[]; isSettled?: boolean } } = {};

    bets.filter(bet => bet.status === 'CLOSED').forEach(bet => {
      const winnerId = bet.winnerId;
      const losers = bet.participants?.filter((p: string) => p !== winnerId) || [];

      losers.forEach(loserId => {
        if (loserId === user.uid) {
          // User lost - they owe the winner
          if (winnerId && winnerId !== user.uid) {
            if (!balances[winnerId]) {
              balances[winnerId] = { name: winnerId, amount: 0, bets: [] };
            }
            balances[winnerId].amount += bet.wagerAmount;
            balances[winnerId].bets.push({
              id: bet.id,
              title: bet.title,
              amount: -bet.wagerAmount
            });
          }
        } else if (winnerId === user.uid) {
          // User won - loser owes them
          if (!balances[loserId]) {
            balances[loserId] = { name: loserId, amount: 0, bets: [] };
          }
          balances[loserId].amount += bet.wagerAmount;
          balances[loserId].bets.push({
            id: bet.id,
            title: bet.title,
            amount: bet.wagerAmount
          });
        }
      });
    });

    const owedToYou = Object.entries(balances)
      .filter(([_, data]) => data.amount > 0)
      .map(([personId, data]) => ({
        id: personId,
        name: data.name,
        totalAmount: data.amount,
        bets: data.bets,
        isSettled: data.isSettled
      }));

    const youOwe = Object.entries(balances)
      .filter(([_, data]) => data.amount < 0)
      .map(([personId, data]) => ({
        id: personId,
        name: data.name,
        totalAmount: data.amount,
        bets: data.bets,
        isSettled: data.isSettled
      }));

    const netBalance = owedToYou.reduce((sum, p) => sum + p.totalAmount, 0) +
                      youOwe.reduce((sum, p) => sum + p.totalAmount, 0);

    return { owedToYou, youOwe, netBalance };
  }, [bets, user]);

  // Bets to judge (JUDGE tab)
  const betsToJudge = useMemo(() => {
    return bets.filter(bet => 
      bet.status === 'JUDGE' && bet.creatorId === user?.uid
    );
  }, [bets, user]);

  // History bets (HISTORY tab)
  const historyBets = useMemo(() => {
    let filtered = bets.filter(bet => 
      bet.status === 'CLOSED' || bet.status === 'VOID'
    );

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bet => 
        bet.title?.toLowerCase().includes(query) ||
        bet.description?.toLowerCase().includes(query) ||
        bet.groupName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bets, searchQuery]);

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
          <button className="text-white hover:text-[#ff6b35] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 px-6">
        {/* Tab Pills */}
        <div className="flex gap-9 py-1 mb-4">
          {(['BALANCE', 'JUDGE', 'HISTORY'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 h-9 rounded-md transition-colors
                font-montserrat font-semibold text-[10px]
                ${activeTab === tab
                  ? 'bg-[rgba(255,107,53,0.52)] text-white'
                  : 'bg-black/25 text-white hover:bg-black/30'}
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* BALANCE TAB */}
        {activeTab === 'BALANCE' && (
          <>
            {/* Net Balance Summary Card */}
            <div className="bg-black/25 rounded-md p-3 mb-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-[10px] font-semibold font-montserrat">
                  Net Balance:
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-[#1bec09] text-[8px] font-semibold font-montserrat">
                    You're Owed: ${balanceData.owedToYou.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2)}
                  </p>
                  <p className="text-red-500 text-[8px] font-semibold font-montserrat">
                    You Owe: ${Math.abs(balanceData.youOwe.reduce((sum, p) => sum + p.totalAmount, 0)).toFixed(2)}
                  </p>
                </div>
              </div>
              <p className={`text-[12px] font-semibold font-montserrat ${
                balanceData.netBalance > 0 ? 'text-[#1bec09]' : 
                balanceData.netBalance < 0 ? 'text-red-500' : 
                'text-white'
              }`}>
                {balanceData.netBalance > 0 ? '+' : ''}${balanceData.netBalance.toFixed(2)}
              </p>
            </div>

            {/* Owed To You Section */}
            <div className="mb-6">
              <h2 className="text-white text-[12px] font-bold font-montserrat uppercase mb-3">
                OWED TO YOU
              </h2>
              {balanceData.owedToYou.length === 0 ? (
                <p className="text-white/50 text-[12px] font-montserrat italic text-center py-4">
                  No outstanding balances
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {balanceData.owedToYou.map(person => (
                    <SettlePersonCard
                      key={person.id}
                      person={person}
                      onRequestVenmo={() => {/* TODO */}}
                      onMarkAsSettled={() => {/* TODO */}}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* You Owe Section */}
            <div>
              <h2 className="text-white text-[12px] font-bold font-montserrat uppercase mb-3">
                YOU OWE
              </h2>
              {balanceData.youOwe.length === 0 ? (
                <p className="text-white/50 text-[12px] font-montserrat italic text-center py-4">
                  All settled up!
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {balanceData.youOwe.map(person => (
                    <SettlePersonCard
                      key={person.id}
                      person={person}
                      onSendVenmo={() => {/* TODO */}}
                      onMarkAsSettled={() => {/* TODO */}}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* JUDGE TAB */}
        {activeTab === 'JUDGE' && (
          <>
            {betsToJudge.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-white/50 text-[14px] font-montserrat italic">
                  No Bets to Judge!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {betsToJudge.map(bet => (
                  <ActiveBetCard
                    key={bet.id}
                    bet={bet}
                    currentUserId={user.uid}
                    onJudge={async (result) => {
                      // TODO: Implement judge handler
                      console.log('Judge:', result);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <>
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

            {historyBets.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-white/50 text-[14px] font-montserrat italic">
                  No Archived Bets!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {historyBets.map(bet => (
                  <ActiveBetCard
                    key={bet.id}
                    bet={bet}
                    currentUserId={user.uid}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE BET Floating Button */}
      <button
        onClick={() => {/* TODO: Open bet wizard */}}
        className="fixed bottom-[84px] right-6 z-40 px-6 py-2 h-9 bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)] text-white text-[10px] font-semibold font-montserrat rounded-md shadow-lg shadow-[#ff6b35]/30 transition-colors"
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
            className="flex flex-col items-center justify-center gap-1 text-[#ff6b35]"
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
