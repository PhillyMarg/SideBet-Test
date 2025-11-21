"use client";

import { useRouter } from 'next/navigation';
import { Tournament } from '@/types/tournament';
import { Calendar, Users, Trophy } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const router = useRouter();
  const startDate = new Date(tournament.startDate);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/events/${tournament.id}`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
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

  return (
    <div
      onClick={handleClick}
      className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-[#ff6b35] transition-colors cursor-pointer"
    >
      {/* Tournament Name */}
      <h3 className="text-lg font-bold text-white mb-2 font-montserrat">
        {tournament.name}
      </h3>

      {/* Description */}
      {tournament.description && (
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
          {tournament.description}
        </p>
      )}

      {/* Info Row */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{formatDate(startDate)} • {formatTime(tournament.startTime)}</span>
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

      {/* Privacy Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${
          tournament.isPublic
            ? 'bg-green-500/10 text-green-400'
            : 'bg-blue-500/10 text-blue-400'
        }`}>
          {tournament.isPublic ? 'Public' : 'Private'}
        </span>

        <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
          {tournament.type === 'single' ? 'Single Elimination' : 'Double Elimination'}
        </span>
      </div>
    </div>
  );
}
