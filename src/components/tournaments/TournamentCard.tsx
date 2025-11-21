"use client";

import { useRouter } from 'next/navigation';
import { Tournament } from '@/types/tournament';
import { Calendar, Users, Trophy, Lock, Globe } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/events/${tournament.id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isLive = tournament.status === 'live';

  return (
    <div
      onClick={handleClick}
      className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-[#ff6b35] transition-colors cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm font-montserrat truncate">
              {tournament.name}
            </h3>
            {isLive && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-red-500 uppercase">LIVE</span>
              </div>
            )}
          </div>

          {tournament.description && (
            <p className="text-zinc-500 text-xs line-clamp-1">
              {tournament.description}
            </p>
          )}
        </div>

        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ml-2 ${
          tournament.isPublic
            ? 'bg-green-500/10 text-green-400'
            : 'bg-blue-500/10 text-blue-400'
        }`}>
          {tournament.isPublic ? <Globe size={10} /> : <Lock size={10} />}
        </span>
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(tournament.startDate)}
        </span>

        <span className="flex items-center gap-1">
          <Users size={12} />
          {tournament.participants.length}/{tournament.maxParticipants}
        </span>

        <span className="flex items-center gap-1">
          <Trophy size={12} />
          {tournament.totalBets}
        </span>
      </div>

      {/* Type Badge */}
      <div className="mt-3">
        <span className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 uppercase">
          {tournament.type === 'single' ? 'Single Elim' : 'Double Elim'}
        </span>
      </div>
    </div>
  );
}
