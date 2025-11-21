"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { getTournament } from '@/services/tournamentService';
import { Tournament } from '@/types/tournament';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Users,
  Trophy,
  Lock,
  Globe,
  ArrowLeft,
  Settings,
  MessageSquare
} from 'lucide-react';

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bracket" | "participants" | "standard" | "dynamic">("bracket");

  // Fetch tournament
  useEffect(() => {
    async function loadTournament() {
      try {
        setLoading(true);
        const data = await getTournament(tournamentId);

        if (!data) {
          setError('Tournament not found');
          return;
        }

        // Check access for private tournaments
        if (!data.isPublic && user?.uid !== data.creatorId) {
          // TODO: Check if user has access code or is invited
          setError('You do not have access to this tournament');
          return;
        }

        setTournament(data);
      } catch (err) {
        console.error('Error loading tournament:', err);
        setError('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    }

    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-zinc-400">Loading tournament...</div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <div className="text-red-400">{error || 'Tournament not found'}</div>
          <button
            onClick={() => router.push('/events')}
            className="text-[#ff6b35] hover:text-[#ff8555] transition-colors"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const isDirector = user?.uid === tournament.creatorId;
  const isLive = tournament.status === 'live';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-4 pb-20">
        {/* Back Button */}
        <div className="px-4 sm:px-6 mb-4">
          <button
            onClick={() => router.push('/events')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back to Events</span>
          </button>
        </div>

        {/* Tournament Header */}
        <div className="px-4 sm:px-6 mb-6">
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            {/* Title Row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white font-montserrat">
                    {tournament.name}
                  </h1>
                  {isLive && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-semibold text-red-500 uppercase">LIVE</span>
                    </div>
                  )}
                </div>

                {tournament.description && (
                  <p className="text-zinc-400 text-sm mb-3">
                    {tournament.description}
                  </p>
                )}

                {/* Info Pills */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                    tournament.isPublic
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {tournament.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                    {tournament.isPublic ? 'Public' : 'Private'}
                  </span>

                  <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                    {tournament.type === 'single' ? 'Single Elimination' : 'Double Elimination'}
                  </span>

                  <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                    <Users size={12} />
                    {tournament.participants.length}/{tournament.maxParticipants} Players
                  </span>

                  <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                    <Trophy size={12} />
                    {tournament.totalBets} Bets
                  </span>
                </div>
              </div>

              {/* Director Actions */}
              {isDirector && (
                <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors">
                  <Settings size={16} />
                  Manage
                </button>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Starts</div>
                <div className="text-sm text-white flex items-center gap-2">
                  <Calendar size={14} />
                  {formatDate(tournament.startDate)}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-1">Ends</div>
                <div className="text-sm text-white flex items-center gap-2">
                  <Calendar size={14} />
                  {formatDate(tournament.endDate)}
                </div>
              </div>
            </div>

            {/* Access Code (for private tournaments) */}
            {!tournament.isPublic && tournament.accessCode && isDirector && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Access Code</div>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-bold text-[#ff6b35] font-mono tracking-wider">
                    {tournament.accessCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tournament.accessCode!);
                      // TODO: Show toast notification
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[120px] z-20 bg-[#0a0a0a] border-b border-zinc-800 py-3">
          <div className="px-4 sm:px-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab("bracket")}
                className={`
                  text-[12px] font-semibold font-montserrat
                  px-3 py-2
                  rounded-lg
                  whitespace-nowrap
                  transition-colors
                  ${activeTab === "bracket"
                    ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                    : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                  }
                `}
              >
                BRACKET
              </button>

              <button
                onClick={() => setActiveTab("participants")}
                className={`
                  text-[12px] font-semibold font-montserrat
                  px-3 py-2
                  rounded-lg
                  whitespace-nowrap
                  transition-colors
                  ${activeTab === "participants"
                    ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                    : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                  }
                `}
              >
                PARTICIPANTS ({tournament.participants.length})
              </button>

              <button
                onClick={() => setActiveTab("standard")}
                className={`
                  text-[12px] font-semibold font-montserrat
                  px-3 py-2
                  rounded-lg
                  whitespace-nowrap
                  transition-colors
                  ${activeTab === "standard"
                    ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                    : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                  }
                `}
              >
                STANDARD BETS
              </button>

              <button
                onClick={() => setActiveTab("dynamic")}
                className={`
                  text-[12px] font-semibold font-montserrat
                  px-3 py-2
                  rounded-lg
                  whitespace-nowrap
                  transition-colors
                  ${activeTab === "dynamic"
                    ? 'border-2 border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10'
                    : 'border-2 border-transparent text-white hover:text-[#ff6b35]'
                  }
                `}
              >
                DYNAMIC BETS
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 mt-4">
          {activeTab === "bracket" && (
            <BracketTab tournament={tournament} isDirector={isDirector} />
          )}

          {activeTab === "participants" && (
            <ParticipantsTab tournament={tournament} isDirector={isDirector} />
          )}

          {activeTab === "standard" && (
            <StandardBetsTab tournament={tournament} />
          )}

          {activeTab === "dynamic" && (
            <DynamicBetsTab tournament={tournament} />
          )}
        </div>

        {/* Tournament Chat/Feed (optional for now) */}
        <div className="px-4 sm:px-6 mt-6">
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
            <MessageSquare className="mx-auto mb-2 text-zinc-600" size={24} />
            <p className="text-zinc-500 text-sm">Tournament chat coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Placeholder tab components
function BracketTab({ tournament, isDirector }: { tournament: Tournament; isDirector: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
      <p className="text-zinc-400">Bracket visualization coming soon</p>
      <p className="text-zinc-500 text-sm mt-2">
        {tournament.participants.length} participants • {tournament.type} elimination
      </p>
    </div>
  );
}

function ParticipantsTab({ tournament, isDirector }: { tournament: Tournament; isDirector: boolean }) {
  if (tournament.participants.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
        <p className="text-zinc-400">No participants yet</p>
        {isDirector && (
          <button className="mt-3 text-[#ff6b35] hover:text-[#ff8555] text-sm">
            + Add Participants
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tournament.participants
        .sort((a, b) => a.seed - b.seed)
        .map((participant) => (
          <div
            key={participant.userId}
            className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-bold text-sm">
                {participant.seed}
              </div>
              <span className="text-white font-semibold">{participant.userName}</span>
            </div>

            {participant.eliminated && (
              <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">
                Eliminated
              </span>
            )}
          </div>
        ))}
    </div>
  );
}

function StandardBetsTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
      <p className="text-zinc-400">Standard bets will appear here</p>
      <p className="text-zinc-500 text-sm mt-2">
        Auto-generated bets for tournament outcomes
      </p>
    </div>
  );
}

function DynamicBetsTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
      <p className="text-zinc-400">Dynamic bets will appear here</p>
      <p className="text-zinc-500 text-sm mt-2">
        User-created custom bets
      </p>
    </div>
  );
}
