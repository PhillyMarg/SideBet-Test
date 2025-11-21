"use client";

import { TournamentBet } from '@/types/tournamentBet';
import { Trophy, Users, Clock, DollarSign } from 'lucide-react';

interface TournamentBetCardProps {
  bet: TournamentBet;
  onClick?: () => void;
  userPick?: string; // Current user's pick (if any)
}

export function TournamentBetCard({ bet, onClick, userPick }: TournamentBetCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    switch (bet.status) {
      case 'open':
        return (
          <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
            Open
          </span>
        );
      case 'closed':
        return (
          <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
            In Progress
          </span>
        );
      case 'judging':
        return (
          <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400">
            Judging
          </span>
        );
      case 'settled':
        return (
          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
            Settled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-zinc-900 rounded-lg p-4 border border-zinc-800
        ${onClick ? 'cursor-pointer hover:border-[#ff6b35]' : ''}
        transition-colors
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">{bet.title}</h3>
          {bet.description && (
            <p className="text-sm text-zinc-400">{bet.description}</p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* User's Pick (if any) */}
      {userPick && (
        <div className="mb-3 p-2 bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded">
          <p className="text-sm text-[#ff6b35]">Your pick: {userPick}</p>
        </div>
      )}

      {/* Info Row */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <DollarSign size={14} />
          <span>${bet.wagerAmount} to enter</span>
        </div>

        <div className="flex items-center gap-1">
          <Trophy size={14} />
          <span>${bet.totalPot} pot</span>
        </div>

        <div className="flex items-center gap-1">
          <Users size={14} />
          <span>{bet.picks.length} picks</span>
        </div>
      </div>

      {/* Timing */}
      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-zinc-500">
          <Clock size={12} />
          <span>
            {bet.status === 'settled'
              ? `Settled ${bet.settledAt ? formatDate(bet.settledAt) : ''}`
              : `Closes ${formatDate(bet.closesAt)}`}
          </span>
        </div>

        {!bet.isStandard && (
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
            Custom
          </span>
        )}
      </div>

      {/* Winner display for settled bets */}
      {bet.status === 'settled' && bet.winningSelection && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-sm">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-zinc-400">
              Winner:{' '}
              <span className="text-white font-semibold">
                {bet.picks.find((p) => p.selection === bet.winningSelection)
                  ?.selectionLabel || 'N/A'}
              </span>
            </span>
          </div>
          {bet.winnerIds && bet.winnerIds.length > 0 && (
            <p className="text-xs text-green-400 mt-1">
              {bet.winnerIds.length} winner(s) split $
              {bet.totalPot.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
