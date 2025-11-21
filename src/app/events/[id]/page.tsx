"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Header } from "@/components/layout/Header";
import { ArrowLeft, Calendar, Users, Trophy, UserPlus, Shuffle, Trash2 } from 'lucide-react';
import { getTournament, removeParticipant } from '@/services/tournamentService';
import { Tournament } from '@/types/tournament';
import { AddParticipantsModal } from '@/components/tournaments/AddParticipantsModal';
import { AssignSeedsModal } from '@/components/tournaments/AssignSeedsModal';

type TabType = 'overview' | 'participants' | 'bracket' | 'bets';

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch tournament
  const loadTournament = async () => {
    try {
      setTournamentLoading(true);
      const data = await getTournament(tournamentId);
      setTournament(data);
      setTournamentError(null);
    } catch (err) {
      console.error('Error loading tournament:', err);
      setTournamentError('Failed to load tournament');
    } finally {
      setTournamentLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

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

  const isDirector = user && tournament && user.uid === tournament.creatorId;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading || tournamentLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header userId={user?.uid} />
        <main className="pt-4 pb-20">
          <div className="px-4 sm:px-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-800 rounded w-32 mb-4"></div>
              <div className="h-4 bg-zinc-800 rounded w-64"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (tournamentError || !tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header userId={user?.uid} />
        <main className="pt-4 pb-20">
          <div className="px-4 sm:px-6">
            <button
              onClick={() => router.push('/events')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
            >
              <ArrowLeft size={20} />
              Back to Events
            </button>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <p className="text-red-400">{tournamentError || 'Tournament not found'}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header userId={user?.uid} />

      <main className="pt-4 pb-20">
        {/* Back Button */}
        <div className="px-4 sm:px-6 mb-4">
          <button
            onClick={() => router.push('/events')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
            Back to Events
          </button>
        </div>

        {/* Tournament Header */}
        <div className="px-4 sm:px-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white font-montserrat mb-2">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-zinc-400 text-sm mb-3">
                  {tournament.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{formatDate(tournament.startDate)} • {formatTime(tournament.startTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{tournament.participants.length}/{tournament.maxParticipants}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy size={14} />
                  <span>{tournament.totalBets} bets</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`text-xs px-3 py-1 rounded font-semibold ${
              tournament.status === 'live'
                ? 'bg-red-500/10 text-red-400'
                : tournament.status === 'upcoming'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-zinc-500/10 text-zinc-400'
            }`}>
              {tournament.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[60px] z-20 bg-[#0a0a0a] border-b border-zinc-800">
          <div className="px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {(['overview', 'participants', 'bracket', 'bets'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    text-[12px] font-semibold font-montserrat
                    px-4 py-3
                    whitespace-nowrap
                    transition-colors
                    border-b-2
                    ${activeTab === tab
                      ? 'border-[#ff6b35] text-[#ff6b35]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                    }
                  `}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 mt-4">
          {activeTab === 'overview' && (
            <OverviewTab tournament={tournament} />
          )}
          {activeTab === 'participants' && (
            <ParticipantsTab
              tournament={tournament}
              isDirector={!!isDirector}
              onRefresh={loadTournament}
            />
          )}
          {activeTab === 'bracket' && (
            <BracketTab tournament={tournament} />
          )}
          {activeTab === 'bets' && (
            <BetsTab tournament={tournament} />
          )}
        </div>
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <h3 className="text-sm font-bold text-white mb-3 font-montserrat">Tournament Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Type</span>
            <span className="text-white">
              {tournament.type === 'single' ? 'Single Elimination' : 'Double Elimination'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Bracket Size</span>
            <span className="text-white">{tournament.bracketSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Director</span>
            <span className="text-white">{tournament.creatorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Privacy</span>
            <span className="text-white">{tournament.isPublic ? 'Public' : 'Private'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Participants Tab
function ParticipantsTab({
  tournament,
  isDirector,
  onRefresh
}: {
  tournament: Tournament;
  isDirector: boolean;
  onRefresh: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemoveParticipant = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from the tournament?`)) return;

    try {
      setRemoving(userId);
      await removeParticipant(tournament.id, userId);
      onRefresh();
    } catch (err) {
      console.error('Error removing participant:', err);
      alert('Failed to remove participant');
    } finally {
      setRemoving(null);
    }
  };

  const handleParticipantAdded = () => {
    onRefresh();
  };

  const handleSeedsUpdated = () => {
    onRefresh();
  };

  if (tournament.participants.length === 0) {
    return (
      <>
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
          <p className="text-zinc-400 mb-4">No participants yet</p>
          {isDirector && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#ff6b35] hover:bg-[#ff8555] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <UserPlus size={16} />
              Add Participants
            </button>
          )}
        </div>

        {isDirector && (
          <AddParticipantsModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            tournament={tournament}
            onParticipantAdded={handleParticipantAdded}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Director Actions */}
      {isDirector && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={tournament.participants.length >= tournament.maxParticipants}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6b35] hover:bg-[#ff8555] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={16} />
            Add Participants
          </button>

          <button
            onClick={() => setShowSeedModal(true)}
            disabled={tournament.participants.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle size={16} />
            Assign Seeds
          </button>
        </div>
      )}

      {/* Participants List */}
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

              <div className="flex items-center gap-2">
                {participant.eliminated && (
                  <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">
                    Eliminated
                  </span>
                )}

                {isDirector && (
                  <button
                    onClick={() => handleRemoveParticipant(participant.userId, participant.userName)}
                    disabled={removing === participant.userId}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="Remove participant"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Modals */}
      {isDirector && (
        <>
          <AddParticipantsModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            tournament={tournament}
            onParticipantAdded={handleParticipantAdded}
          />

          <AssignSeedsModal
            isOpen={showSeedModal}
            onClose={() => setShowSeedModal(false)}
            tournament={tournament}
            onSeedsUpdated={handleSeedsUpdated}
          />
        </>
      )}
    </>
  );
}

// Bracket Tab (placeholder)
function BracketTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
      <p className="text-zinc-400">Bracket view coming soon</p>
    </div>
  );
}

// Bets Tab (placeholder)
function BetsTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
      <p className="text-zinc-400">No bets placed yet</p>
    </div>
  );
}
