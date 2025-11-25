"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../../lib/firebase/client';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { ChevronDown } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import BottomNav from '@/components/BottomNav';
import { LedgerEntry, PersonBalance } from '@/types/ledger';
import { Bet } from '@/components/bets/GroupBetCard';
import JudgeBetModal from '@/components/JudgeBetModal';

export default function SettlePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState('balances');
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState<Bet | null>(null);

  // Balances tab data
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [consolidatedBalances, setConsolidatedBalances] = useState<PersonBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Judge tab data
  const [pendingJudgments, setPendingJudgments] = useState<Bet[]>([]);
  const [judgeLoading, setJudgeLoading] = useState(false);

  // History tab data
  const [settledEntries, setSettledEntries] = useState<LedgerEntry[]>([]);
  const [completedBets, setCompletedBets] = useState<Bet[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch balances data when user is available and tab is active
  useEffect(() => {
    if (user && activeSubTab === 'balances') {
      fetchBalancesData();
    }
  }, [user, activeSubTab]);

  // Fetch judge data when user is available and tab is active
  useEffect(() => {
    if (user && activeSubTab === 'judge') {
      fetchJudgeData();
    }
  }, [user, activeSubTab]);

  // Fetch history data when user is available and tab is active
  useEffect(() => {
    if (user && activeSubTab === 'history') {
      fetchHistoryData();
    }
  }, [user, activeSubTab]);

  const fetchBalancesData = async () => {
    if (!user) return;

    setBalancesLoading(true);
    try {
      // Query ledger for unsettled entries where user is involved
      const ledgerRef = collection(db, 'ledger');

      // Get entries where user owes money (fromUserId)
      const owingQuery = query(
        ledgerRef,
        where('fromUserId', '==', user.uid),
        where('settled', '==', false)
      );
      const owingSnapshot = await getDocs(owingQuery);

      // Get entries where user is owed money (toUserId)
      const owedQuery = query(
        ledgerRef,
        where('toUserId', '==', user.uid),
        where('settled', '==', false)
      );
      const owedSnapshot = await getDocs(owedQuery);

      // Combine all entries
      const allEntries: LedgerEntry[] = [];
      owingSnapshot.forEach(doc => {
        allEntries.push({ id: doc.id, ...doc.data() } as LedgerEntry);
      });
      owedSnapshot.forEach(doc => {
        allEntries.push({ id: doc.id, ...doc.data() } as LedgerEntry);
      });

      setLedgerEntries(allEntries);

      // Consolidate by person
      const balancesByPerson = new Map<string, PersonBalance>();

      allEntries.forEach(entry => {
        const isOwing = entry.fromUserId === user.uid;
        const otherUserId = isOwing ? entry.toUserId : entry.fromUserId;
        const otherUserName = isOwing ? entry.toUserName : entry.fromUserName;
        const otherUserVenmo = isOwing ? entry.toUserVenmo : entry.fromUserVenmo;
        const amount = isOwing ? -entry.amount : entry.amount;

        if (!balancesByPerson.has(otherUserId)) {
          balancesByPerson.set(otherUserId, {
            userId: otherUserId,
            userName: otherUserName,
            venmoUsername: otherUserVenmo,
            netAmount: 0,
            bets: [],
          });
        }

        const balance = balancesByPerson.get(otherUserId)!;
        balance.netAmount += amount;
        balance.bets.push({
          betId: entry.betId,
          betTitle: entry.betTitle,
          amount: amount,
        });
      });

      const consolidated = Array.from(balancesByPerson.values());
      setConsolidatedBalances(consolidated);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  };

  const fetchJudgeData = async () => {
    if (!user) return;

    setJudgeLoading(true);
    try {
      // Query bets where user is creator and status is CLOSED
      const betsRef = collection(db, 'bets');
      const closedBetsQuery = query(
        betsRef,
        where('creatorId', '==', user.uid),
        where('status', '==', 'CLOSED')
      );

      const snapshot = await getDocs(closedBetsQuery);
      const bets: Bet[] = [];

      snapshot.forEach(doc => {
        const betData = doc.data();
        // Only include bets that have actually closed (past closing time)
        if (new Date(betData.closingAt) <= new Date()) {
          bets.push({ id: doc.id, ...betData } as Bet);
        }
      });

      setPendingJudgments(bets);
    } catch (error) {
      console.error('Error fetching pending judgments:', error);
    } finally {
      setJudgeLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    if (!user) return;

    setHistoryLoading(true);
    try {
      // Fetch settled ledger entries
      const ledgerRef = collection(db, 'ledger');

      const settledOwingQuery = query(
        ledgerRef,
        where('fromUserId', '==', user.uid),
        where('settled', '==', true)
      );
      const settledOwedQuery = query(
        ledgerRef,
        where('toUserId', '==', user.uid),
        where('settled', '==', true)
      );

      const [owingSnapshot, owedSnapshot] = await Promise.all([
        getDocs(settledOwingQuery),
        getDocs(settledOwedQuery)
      ]);

      const settled: LedgerEntry[] = [];
      owingSnapshot.forEach(doc => {
        settled.push({ id: doc.id, ...doc.data() } as LedgerEntry);
      });
      owedSnapshot.forEach(doc => {
        settled.push({ id: doc.id, ...doc.data() } as LedgerEntry);
      });

      setSettledEntries(settled);

      // Fetch completed bets (JUDGED status) where user participated
      const betsRef = collection(db, 'bets');
      const judgedBetsQuery = query(
        betsRef,
        where('status', '==', 'JUDGED')
      );

      const betsSnapshot = await getDocs(judgedBetsQuery);
      const bets: Bet[] = [];

      betsSnapshot.forEach(doc => {
        const betData = doc.data();
        // Only include bets where current user participated
        if (betData.participants?.includes(user.uid)) {
          bets.push({ id: doc.id, ...betData } as Bet);
        }
      });

      // Sort by judgedAt date (most recent first)
      bets.sort((a, b) => {
        const dateA = a.judgedAt ? new Date(a.judgedAt).getTime() : 0;
        const dateB = b.judgedAt ? new Date(b.judgedAt).getTime() : 0;
        return dateB - dateA;
      });

      setCompletedBets(bets);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMarkSettled = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Find all ledger entries between current user and the other user
      const entriesToSettle = ledgerEntries.filter(entry =>
        (entry.fromUserId === user.uid && entry.toUserId === otherUserId) ||
        (entry.toUserId === user.uid && entry.fromUserId === otherUserId)
      );

      // Update all entries to settled
      const updatePromises = entriesToSettle.map(entry => {
        if (!entry.id) return Promise.resolve();
        const ledgerDoc = doc(db, 'ledger', entry.id);
        return updateDoc(ledgerDoc, {
          settled: true,
          settledAt: new Date().toISOString(),
        });
      });

      await Promise.all(updatePromises);

      // Refresh balances data
      await fetchBalancesData();

      alert('Marked as settled!');
    } catch (error) {
      console.error('Error marking as settled:', error);
      alert('Failed to mark as settled. Please try again.');
    }
  };

  const getVenmoLink = (venmoUsername: string, amount: number, isRequest: boolean): string => {
    const txnType = isRequest ? 'charge' : 'pay';
    const note = encodeURIComponent('SideBet settlement');
    // Remove @ if present
    const cleanUsername = venmoUsername.startsWith('@') ? venmoUsername.slice(1) : venmoUsername;
    return `venmo://paycharge?txn=${txnType}&recipients=${cleanUsername}&amount=${Math.abs(amount).toFixed(2)}&note=${note}`;
  };

  const subTabs = ['Balances', 'Judge', 'History'];

  // Calculate totals for summary card
  const totalOwed = consolidatedBalances
    .filter(b => b.netAmount > 0)
    .reduce((sum, b) => sum + b.netAmount, 0);
  const totalOwe = consolidatedBalances
    .filter(b => b.netAmount < 0)
    .reduce((sum, b) => sum + Math.abs(b.netAmount), 0);
  const netBalance = totalOwed - totalOwe;

  // Calculate stats for history tab
  const totalBets = completedBets.length;
  const wonBets = completedBets.filter(bet => bet.winners?.includes(user?.uid || '')).length;
  const lostBets = totalBets - wonBets;
  const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <Header userId={user?.uid} />

      {/* Main Content */}
      <main className="pt-14 pb-24">

        {/* Page Title */}
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-white font-montserrat">Settle</h1>
        </div>

        {/* Sub-tabs */}
        <div className="flex px-6 gap-2 mb-4">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab.toLowerCase())}
              className={`
                flex-1 py-2 rounded-lg font-medium text-sm font-montserrat transition-colors
                ${activeSubTab === tab.toLowerCase()
                  ? 'bg-[#ff6b35] text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }
              `}
            >
              {tab}
              {tab === 'Judge' && pendingJudgments.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {pendingJudgments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="px-6">

          {/* Balances Tab */}
          {activeSubTab === 'balances' && (
            <div className="space-y-3">
              {balancesLoading ? (
                <div className="text-center py-12 text-zinc-400 font-montserrat">Loading...</div>
              ) : consolidatedBalances.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 font-montserrat">No outstanding balances</p>
                </div>
              ) : (
                <>
                  {/* Summary Card */}
                  <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-zinc-400 text-sm font-montserrat">Net Balance</p>
                        <p className={`text-2xl font-bold font-montserrat ${netBalance >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-400 font-montserrat">
                          You&apos;re owed: <span className="text-green-500">${totalOwed.toFixed(2)}</span>
                        </p>
                        <p className="text-sm text-zinc-400 font-montserrat">
                          You owe: <span className="text-red-400">${totalOwe.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section: Owed to You */}
                  {consolidatedBalances.filter(b => b.netAmount > 0).length > 0 && (
                    <>
                      <p className="text-sm text-zinc-500 font-medium mt-4 mb-2 font-montserrat">OWED TO YOU</p>
                      {consolidatedBalances.filter(b => b.netAmount > 0).map((person) => (
                        <div key={person.userId} className="bg-zinc-800 rounded-xl overflow-hidden">
                          <div
                            onClick={() => setExpandedPerson(expandedPerson === person.userId ? null : person.userId)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium font-montserrat">
                                {person.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span className="font-medium font-montserrat">{person.userName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-green-500 font-bold font-montserrat">+${person.netAmount.toFixed(2)}</span>
                              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${expandedPerson === person.userId ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {expandedPerson === person.userId && (
                            <div className="px-4 pb-4 border-t border-zinc-700">
                              <div className="pt-3 space-y-2">
                                {person.bets.map((bet, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-zinc-400 font-montserrat">{bet.betTitle}</span>
                                    <span className="text-green-500 font-montserrat">+${bet.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {person.venmoUsername ? (
                                <a
                                  href={getVenmoLink(person.venmoUsername, person.netAmount, true)}
                                  className="mt-4 w-full block text-center py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm font-montserrat transition-colors"
                                >
                                  Request ${person.netAmount.toFixed(2)} via Venmo
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="mt-4 w-full py-2.5 bg-zinc-700 rounded-lg font-medium text-sm font-montserrat text-zinc-500 cursor-not-allowed"
                                  title="They haven't added Venmo yet"
                                >
                                  Venmo not available
                                </button>
                              )}
                              <button
                                onClick={() => handleMarkSettled(person.userId)}
                                className="mt-2 w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium text-sm font-montserrat text-white transition-colors"
                              >
                                Mark as Settled
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Section: You Owe */}
                  {consolidatedBalances.filter(b => b.netAmount < 0).length > 0 && (
                    <>
                      <p className="text-sm text-zinc-500 font-medium mt-6 mb-2 font-montserrat">YOU OWE</p>
                      {consolidatedBalances.filter(b => b.netAmount < 0).map((person) => (
                        <div key={person.userId} className="bg-zinc-800 rounded-xl overflow-hidden">
                          <div
                            onClick={() => setExpandedPerson(expandedPerson === person.userId ? null : person.userId)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium font-montserrat">
                                {person.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span className="font-medium font-montserrat">{person.userName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-red-400 font-bold font-montserrat">-${Math.abs(person.netAmount).toFixed(2)}</span>
                              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${expandedPerson === person.userId ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {expandedPerson === person.userId && (
                            <div className="px-4 pb-4 border-t border-zinc-700">
                              <div className="pt-3 space-y-2">
                                {person.bets.map((bet, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-zinc-400 font-montserrat">{bet.betTitle}</span>
                                    <span className="text-red-400 font-montserrat">${bet.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {person.venmoUsername ? (
                                <a
                                  href={getVenmoLink(person.venmoUsername, person.netAmount, false)}
                                  className="mt-4 w-full block text-center py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-sm font-montserrat transition-colors"
                                >
                                  Pay ${Math.abs(person.netAmount).toFixed(2)} via Venmo
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="mt-4 w-full py-2.5 bg-zinc-700 rounded-lg font-medium text-sm font-montserrat text-zinc-500 cursor-not-allowed"
                                  title="They haven't added Venmo yet"
                                >
                                  Venmo not available
                                </button>
                              )}
                              <button
                                onClick={() => handleMarkSettled(person.userId)}
                                className="mt-2 w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium text-sm font-montserrat text-white transition-colors"
                              >
                                Mark as Settled
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Judge Tab */}
          {activeSubTab === 'judge' && (
            <div className="space-y-3">
              {judgeLoading ? (
                <div className="text-center py-12 text-zinc-400 font-montserrat">Loading...</div>
              ) : pendingJudgments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-zinc-400 font-montserrat">No bets waiting for your judgment</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 mb-3 font-montserrat">Bets you created that need results</p>
                  {pendingJudgments.map((bet) => {
                    const totalPot = (bet.perUserWager || 0) * (bet.participants?.length || 0);
                    const closedTime = new Date(bet.closingAt);
                    const now = new Date();
                    const hoursDiff = Math.floor((now.getTime() - closedTime.getTime()) / (1000 * 60 * 60));
                    const closedAgo = hoursDiff < 1 ? 'less than 1 hour ago' :
                                     hoursDiff < 24 ? `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago` :
                                     `${Math.floor(hoursDiff / 24)} day${Math.floor(hoursDiff / 24) > 1 ? 's' : ''} ago`;

                    return (
                      <div key={bet.id} className="bg-zinc-800 rounded-xl p-4">
                        {/* Fetch and show group name if available */}
                        <BetGroupName groupId={bet.groupId} />
                        <p className="font-medium mb-3 font-montserrat">{bet.title}</p>
                        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-2 font-montserrat">
                          <span>Closed {closedAgo}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4 font-montserrat">
                          <span>{bet.participants?.length || 0} players</span>
                          <span>Pot: ${totalPot.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => setShowJudgeModal(bet)}
                          className="w-full py-3 bg-[#ff6b35] hover:bg-[#ff7a4d] rounded-lg font-medium font-montserrat transition-colors"
                        >
                          Judge Outcome
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              {historyLoading ? (
                <div className="text-center py-12 text-zinc-400 font-montserrat">Loading...</div>
              ) : completedBets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 font-montserrat">No bet history yet</p>
                </div>
              ) : (
                <>
                  {/* Stats Summary */}
                  <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold font-montserrat">{totalBets}</p>
                        <p className="text-xs text-zinc-400 font-montserrat">Total Bets</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500 font-montserrat">{wonBets}</p>
                        <p className="text-xs text-zinc-400 font-montserrat">Won</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400 font-montserrat">{lostBets}</p>
                        <p className="text-xs text-zinc-400 font-montserrat">Lost</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-700 flex justify-between">
                      <span className="text-sm text-zinc-400 font-montserrat">Win Rate</span>
                      <span className="text-sm font-medium text-green-500 font-montserrat">{winRate}%</span>
                    </div>
                  </div>

                  {/* History List */}
                  {completedBets.map((bet) => {
                    const userWon = bet.winners?.includes(user.uid);
                    const userPick = bet.picks?.[user.uid];
                    const amount = userWon
                      ? (bet.payoutPerWinner || 0) - (bet.perUserWager || 0)
                      : -(bet.perUserWager || 0);
                    const judgedDate = bet.judgedAt ? new Date(bet.judgedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

                    return (
                      <div key={bet.id} className="bg-zinc-800 rounded-xl p-4">
                        <BetGroupNameHistory groupId={bet.groupId} judgedDate={judgedDate} />
                        <p className="font-medium mb-2 font-montserrat">{bet.title}</p>
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-montserrat">
                            <span className="text-zinc-400">Your pick: </span>
                            <span className={userWon ? 'text-green-500' : 'text-red-400'}>{String(userPick || 'N/A')}</span>
                          </div>
                          <span className={`font-bold font-montserrat ${userWon ? 'text-green-500' : 'text-red-400'}`}>
                            {amount >= 0 ? '+' : ''}${amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Judge Modal */}
      {showJudgeModal && (
        <JudgeBetModal
          bet={showJudgeModal}
          onClose={() => {
            setShowJudgeModal(null);
            // Refresh judge data after closing modal
            fetchJudgeData();
          }}
        />
      )}
    </div>
  );
}

// Helper component to fetch and display group name
function BetGroupName({ groupId }: { groupId?: string }) {
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    const fetchGroupName = async () => {
      if (!groupId) return;
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroupName(groupDoc.data().name || 'Unknown Group');
        }
      } catch (error) {
        console.error('Error fetching group name:', error);
      }
    };
    fetchGroupName();
  }, [groupId]);

  if (!groupName) return null;

  return (
    <div className="flex justify-between items-start mb-2">
      <p className="text-xs text-[#ff6b35] font-medium font-montserrat">{groupName}</p>
    </div>
  );
}

// Helper component for history tab group name and date
function BetGroupNameHistory({ groupId, judgedDate }: { groupId?: string; judgedDate: string }) {
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    const fetchGroupName = async () => {
      if (!groupId) return;
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroupName(groupDoc.data().name || 'Unknown Group');
        }
      } catch (error) {
        console.error('Error fetching group name:', error);
      }
    };
    fetchGroupName();
  }, [groupId]);

  return (
    <div className="flex justify-between items-start mb-1">
      <p className="text-xs text-zinc-500 font-montserrat">{groupName || 'Loading...'}</p>
      <p className="text-xs text-zinc-500 font-montserrat">{judgedDate}</p>
    </div>
  );
}
