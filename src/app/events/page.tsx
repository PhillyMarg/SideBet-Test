"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { Header } from "../../components/layout/Header";
import BottomNav from "../../components/BottomNav";
import { Search, X, Plus } from 'lucide-react';
import { CreateTournamentWizard } from '@/components/tournaments/CreateTournamentWizard';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { getTournaments } from '@/services/tournamentService';
import { Tournament } from '@/types/tournament';

export default function EventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("startDate");
  const [filterTab, setFilterTab] = useState<"all" | "live" | "upcoming" | "completed">("all");
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Tournament data
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);

  // Fetch tournaments
  useEffect(() => {
    async function loadTournaments() {
      try {
        setTournamentsLoading(true);
        const data = await getTournaments();
        setTournaments(data);
        setTournamentsError(null);
      } catch (err) {
        console.error('Error loading tournaments:', err);
        setTournamentsError('Failed to load tournaments');
      } finally {
        setTournamentsLoading(false);
      }
    }

    loadTournaments();
  }, [showCreateWizard]); // Refetch when wizard closes

  // Filter tournaments by search and status
  const filteredTournaments = tournaments.filter(t => {
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(query) ||
             t.description?.toLowerCase().includes(query);
    }
    return true;
  });

  // Sort tournaments
  const sortTournaments = (tourns: Tournament[]) => {
    return [...tourns].sort((a, b) => {
      switch (sortBy) {
        case 'startDate':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'mostParticipants':
          return b.participants.length - a.participants.length;
        case 'mostBets':
          return b.totalBets - a.totalBets;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  // Separate by status
  const liveTournaments = sortTournaments(filteredTournaments.filter(t => t.status === 'live'));
  const upcomingTournaments = sortTournaments(filteredTournaments.filter(t => t.status === 'upcoming'));
  const completedTournaments = sortTournaments(filteredTournaments.filter(t => t.status === 'completed'));

  // Auth listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header userId={user?.uid} />
        <main className="pt-14 pb-24">
          <div className="px-4 sm:px-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-800 rounded w-32 mb-4"></div>
              <div className="h-4 bg-zinc-800 rounded w-64"></div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header userId={user?.uid} />

      <main className="pt-14 pb-24">
        {/* Page Title */}
        <div className="px-4 sm:px-6 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white font-montserrat">Events</h1>
            <button className="bg-[#ff6b35] text-white px-4 py-2 rounded-lg text-sm font-semibold font-montserrat hover:bg-[#ff8555] transition-colors flex items-center gap-2">
              <Plus size={16} />
              NEW TOURNAMENT
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="sticky top-[120px] z-20 bg-[#0a0a0a] border-b border-zinc-800 py-3">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              {/* Filter Tabs - Left Side */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`
                    text-[12px] font-semibold font-montserrat
                    px-3 py-2
                    rounded-lg
                    whitespace-nowrap
                    transition-colors
                    ${filterTab === "all"
                      ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                    }
                  `}
                >
                  ALL
                </button>

                <button
                  onClick={() => setFilterTab("live")}
                  className={`
                    text-[12px] font-semibold font-montserrat
                    px-3 py-2
                    rounded-lg
                    whitespace-nowrap
                    transition-colors
                    ${filterTab === "live"
                      ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                    }
                  `}
                >
                  LIVE
                </button>

                <button
                  onClick={() => setFilterTab("upcoming")}
                  className={`
                    text-[12px] font-semibold font-montserrat
                    px-3 py-2
                    rounded-lg
                    whitespace-nowrap
                    transition-colors
                    ${filterTab === "upcoming"
                      ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                    }
                  `}
                >
                  UPCOMING
                </button>

                <button
                  onClick={() => setFilterTab("completed")}
                  className={`
                    text-[12px] font-semibold font-montserrat
                    px-3 py-2
                    rounded-lg
                    whitespace-nowrap
                    transition-colors
                    ${filterTab === "completed"
                      ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                    }
                  `}
                >
                  COMPLETED
                </button>
              </div>

              {/* Create Tournament Button - Right Side */}
              <button
                onClick={() => setShowCreateWizard(true)}
                className="bg-[#ff6b35] text-white px-4 py-2 rounded-lg text-[12px] font-semibold font-montserrat hover:bg-[#ff8555] transition-colors whitespace-nowrap flex-shrink-0"
              >
                CREATE TOURNAMENT
              </button>
            </div>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="sticky top-[180px] z-20 bg-[#0a0a0a] border-b border-zinc-800 py-3">
          <div className="flex items-center gap-2 px-4 sm:px-6">
            {/* Search Bar - 60% */}
            <div className="flex-1 max-w-[60%]">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tournaments..."
                  className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35]"
                />

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 hover:text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown - 40% */}
            <div className="flex-shrink-0 max-w-[40%] w-full">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
              >
                <option value="startDate">Start Date</option>
                <option value="mostParticipants">Most Participants</option>
                <option value="mostBets">Most Bets</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tournament Sections */}
        <div className="px-4 sm:px-6 mt-4 space-y-6">

          {/* Loading State */}
          {tournamentsLoading && (
            <div className="bg-zinc-900 rounded-lg p-6 text-center">
              <p className="text-zinc-400 text-sm">Loading tournaments...</p>
            </div>
          )}

          {/* Error State */}
          {tournamentsError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <p className="text-red-400 text-sm">{tournamentsError}</p>
            </div>
          )}

          {/* Live Tournaments */}
          {!tournamentsLoading && (filterTab === "all" || filterTab === "live") && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-montserrat">
                  LIVE TOURNAMENTS ({liveTournaments.length})
                </h2>
              </div>

              {liveTournaments.length === 0 ? (
                <div className="bg-zinc-900 rounded-lg p-6 text-center">
                  <p className="text-zinc-400 text-sm">No live tournaments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {liveTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onClick={() => router.push(`/events/${tournament.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Upcoming Tournaments */}
          {!tournamentsLoading && (filterTab === "all" || filterTab === "upcoming") && (
            <section>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 font-montserrat">
                UPCOMING TOURNAMENTS ({upcomingTournaments.length})
              </h2>

              {upcomingTournaments.length === 0 ? (
                <div className="bg-zinc-900 rounded-lg p-6 text-center">
                  <p className="text-zinc-400 text-sm">No upcoming tournaments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onClick={() => router.push(`/events/${tournament.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Completed Tournaments */}
          {!tournamentsLoading && (filterTab === "all" || filterTab === "completed") && (
            <section>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 font-montserrat">
                COMPLETED TOURNAMENTS ({completedTournaments.length})
              </h2>

              {completedTournaments.length === 0 ? (
                <div className="bg-zinc-900 rounded-lg p-6 text-center">
                  <p className="text-zinc-400 text-sm">No completed tournaments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onClick={() => router.push(`/events/${tournament.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      {/* Create Tournament Wizard */}
      <CreateTournamentWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
      />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
