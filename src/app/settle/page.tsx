"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';
import { ChevronDown } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import BottomNav from '@/components/BottomNav';

export default function SettlePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState('balances');
  const [expandedPerson, setExpandedPerson] = useState<number | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState<any>(null);

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

  // Mock data - replace with actual Firebase queries
  const balances = [
    {
      id: 1,
      name: 'Ryan M.',
      amount: 25,
      direction: 'owed',
      avatar: 'RM',
      bets: [
        { question: 'Will TG beat Phil in 8Ball?', amount: 15, result: 'You won' },
        { question: 'Chiefs vs Bills', amount: 10, result: 'You won' },
      ]
    },
    {
      id: 2,
      name: 'Sarah K.',
      amount: 15,
      direction: 'owed',
      avatar: 'SK',
      bets: [
        { question: 'First person to spill a drink?', amount: 15, result: 'You won' },
      ]
    },
    {
      id: 3,
      name: 'Mike T.',
      amount: 30,
      direction: 'owe',
      avatar: 'MT',
      bets: [
        { question: 'How many slices will Tom eat?', amount: 20, result: 'You lost' },
        { question: 'Will it rain Saturday?', amount: 10, result: 'You lost' },
      ]
    },
    {
      id: 4,
      name: 'Jessica L.',
      amount: 10,
      direction: 'owe',
      avatar: 'JL',
      bets: [
        { question: 'OSU vs Michigan final score', amount: 10, result: 'You lost' },
      ]
    },
  ];

  const pendingJudgments = [
    {
      id: 1,
      question: 'Will someone cry at the party?',
      group: 'OSU Tailgate Crew',
      closedAt: '2 hours ago',
      players: 6,
      pot: 30,
      options: ['Yes', 'No']
    },
    {
      id: 2,
      question: 'How many beers will Jake drink?',
      group: 'Apartment 4B',
      closedAt: '45 min ago',
      players: 4,
      pot: 20,
      options: ['Under 5', 'Over 5']
    },
  ];

  const history = [
    { id: 1, question: 'Chiefs vs Bills', result: 'Chiefs', yourPick: 'Chiefs', amount: 10, outcome: 'won', date: 'Nov 24', group: 'Fantasy Football' },
    { id: 2, question: 'Will TG beat Phil in 8Ball?', result: 'Yes', yourPick: 'Yes', amount: 15, outcome: 'won', date: 'Nov 23', group: 'Test Group 1' },
    { id: 3, question: 'How many slices will Tom eat?', result: 'Over 6', yourPick: 'Under 6', amount: 20, outcome: 'lost', date: 'Nov 23', group: 'Apartment 4B' },
    { id: 4, question: 'First to leave the party?', result: 'Mike', yourPick: 'Sarah', amount: 5, outcome: 'lost', date: 'Nov 22', group: 'OSU Tailgate Crew' },
    { id: 5, question: 'Will it snow?', result: 'No', yourPick: 'No', amount: 10, outcome: 'won', date: 'Nov 21', group: 'Apartment 4B' },
  ];

  const subTabs = ['Balances', 'Judge', 'History'];

  const totalOwed = balances.filter(b => b.direction === 'owed').reduce((sum, b) => sum + b.amount, 0);
  const totalOwe = balances.filter(b => b.direction === 'owe').reduce((sum, b) => sum + b.amount, 0);
  const netBalance = totalOwed - totalOwe;

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
                      You&apos;re owed: <span className="text-green-500">${totalOwed}</span>
                    </p>
                    <p className="text-sm text-zinc-400 font-montserrat">
                      You owe: <span className="text-red-400">${totalOwe}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Owed to You */}
              <p className="text-sm text-zinc-500 font-medium mt-4 mb-2 font-montserrat">OWED TO YOU</p>
              {balances.filter(b => b.direction === 'owed').map((person) => (
                <div key={person.id} className="bg-zinc-800 rounded-xl overflow-hidden">
                  <div
                    onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium font-montserrat">
                        {person.avatar}
                      </div>
                      <span className="font-medium font-montserrat">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-500 font-bold font-montserrat">+${person.amount}</span>
                      <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${expandedPerson === person.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {expandedPerson === person.id && (
                    <div className="px-4 pb-4 border-t border-zinc-700">
                      <div className="pt-3 space-y-2">
                        {person.bets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-zinc-400 font-montserrat">{bet.question}</span>
                            <span className="text-green-500 font-montserrat">+${bet.amount}</span>
                          </div>
                        ))}
                      </div>
                      <button className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm font-montserrat transition-colors">
                        Request via Venmo
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Section: You Owe */}
              <p className="text-sm text-zinc-500 font-medium mt-6 mb-2 font-montserrat">YOU OWE</p>
              {balances.filter(b => b.direction === 'owe').map((person) => (
                <div key={person.id} className="bg-zinc-800 rounded-xl overflow-hidden">
                  <div
                    onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium font-montserrat">
                        {person.avatar}
                      </div>
                      <span className="font-medium font-montserrat">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold font-montserrat">-${person.amount}</span>
                      <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${expandedPerson === person.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {expandedPerson === person.id && (
                    <div className="px-4 pb-4 border-t border-zinc-700">
                      <div className="pt-3 space-y-2">
                        {person.bets.map((bet, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-zinc-400 font-montserrat">{bet.question}</span>
                            <span className="text-red-400 font-montserrat">-${bet.amount}</span>
                          </div>
                        ))}
                      </div>
                      <button className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-sm font-montserrat transition-colors">
                        Pay via Venmo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Judge Tab */}
          {activeSubTab === 'judge' && (
            <div className="space-y-3">
              {pendingJudgments.length === 0 ? (
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
                  {pendingJudgments.map((bet) => (
                    <div key={bet.id} className="bg-zinc-800 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-[#ff6b35] font-medium font-montserrat">{bet.group}</p>
                        <p className="text-xs text-zinc-500 font-montserrat">Closed {bet.closedAt}</p>
                      </div>
                      <p className="font-medium mb-3 font-montserrat">{bet.question}</p>
                      <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4 font-montserrat">
                        <span>{bet.players} players</span>
                        <span>Pot: ${bet.pot}</span>
                      </div>
                      <button
                        onClick={() => setShowJudgeModal(bet)}
                        className="w-full py-3 bg-[#ff6b35] hover:bg-[#ff7a4d] rounded-lg font-medium font-montserrat transition-colors"
                      >
                        Judge Outcome
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              {/* Stats Summary */}
              <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold font-montserrat">12</p>
                    <p className="text-xs text-zinc-400 font-montserrat">Total Bets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500 font-montserrat">8</p>
                    <p className="text-xs text-zinc-400 font-montserrat">Won</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400 font-montserrat">4</p>
                    <p className="text-xs text-zinc-400 font-montserrat">Lost</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-700 flex justify-between">
                  <span className="text-sm text-zinc-400 font-montserrat">Win Rate</span>
                  <span className="text-sm font-medium text-green-500 font-montserrat">66.7%</span>
                </div>
              </div>

              {/* History List */}
              {history.map((bet) => (
                <div key={bet.id} className="bg-zinc-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs text-zinc-500 font-montserrat">{bet.group}</p>
                    <p className="text-xs text-zinc-500 font-montserrat">{bet.date}</p>
                  </div>
                  <p className="font-medium mb-2 font-montserrat">{bet.question}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-montserrat">
                      <span className="text-zinc-400">Your pick: </span>
                      <span className={bet.outcome === 'won' ? 'text-green-500' : 'text-red-400'}>{bet.yourPick}</span>
                    </div>
                    <span className={`font-bold font-montserrat ${bet.outcome === 'won' ? 'text-green-500' : 'text-red-400'}`}>
                      {bet.outcome === 'won' ? '+' : '-'}${bet.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Judge Modal */}
      {showJudgeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl w-full max-w-sm p-5">
            <h2 className="text-xl font-bold mb-2 font-montserrat">Judge Outcome</h2>
            <p className="text-zinc-400 mb-4 font-montserrat">{showJudgeModal.question}</p>

            <p className="text-sm text-zinc-500 mb-3 font-montserrat">Select the winning outcome:</p>
            <div className="space-y-2 mb-6">
              {showJudgeModal.options.map((option: string, idx: number) => (
                <button
                  key={idx}
                  className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium font-montserrat transition-colors text-left px-4"
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowJudgeModal(null)}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium font-montserrat transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowJudgeModal(null)}
                className="flex-1 py-3 bg-[#ff6b35] hover:bg-[#ff7a4d] rounded-lg font-medium font-montserrat transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
