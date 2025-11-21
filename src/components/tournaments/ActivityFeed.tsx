"use client";

import { useState, useEffect } from 'react';
import { Tournament } from '@/types/tournament';
import { TournamentBet } from '@/types/tournamentBet';
import { getTournamentBets } from '@/services/tournamentBetService';
import { getParticipantName } from '@/services/bracketService';
import {
  Trophy,
  Users,
  DollarSign,
  CheckCircle,
  Zap,
  MessageSquare,
  Clock
} from 'lucide-react';

interface ActivityFeedProps {
  tournament: Tournament;
}

interface ActivityItem {
  id: string;
  type: 'tournament_created' | 'bracket_generated' | 'participant_added' | 'bet_created' | 'bet_placed' | 'match_completed' | 'bet_settled';
  timestamp: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function ActivityFeed({ tournament }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildActivityFeed() {
      try {
        const items: ActivityItem[] = [];

        // Tournament Created
        items.push({
          id: `created-${tournament.id}`,
          type: 'tournament_created',
          timestamp: tournament.createdAt,
          title: 'Tournament Created',
          description: `${tournament.creatorName} created this tournament`,
          icon: <Trophy size={16} />,
          color: 'text-[#ff6b35]'
        });

        // Bracket Generated (if exists)
        if (tournament.matches.length > 0) {
          items.push({
            id: `bracket-${tournament.id}`,
            type: 'bracket_generated',
            timestamp: tournament.createdAt, // Approximate
            title: 'Bracket Generated',
            description: `${tournament.type === 'single' ? 'Single' : 'Double'} elimination bracket created with ${tournament.participants.length} participants`,
            icon: <Zap size={16} />,
            color: 'text-yellow-400'
          });
        }

        // Participants Added
        tournament.participants.forEach((participant, index) => {
          if (index < 5) { // Show first 5 only
            items.push({
              id: `participant-${participant.userId}`,
              type: 'participant_added',
              timestamp: tournament.createdAt, // Approximate
              title: 'Participant Joined',
              description: `${participant.userName} (Seed #${participant.seed}) joined the tournament`,
              icon: <Users size={16} />,
              color: 'text-blue-400'
            });
          }
        });

        if (tournament.participants.length > 5) {
          items.push({
            id: 'participants-more',
            type: 'participant_added',
            timestamp: tournament.createdAt,
            title: 'More Participants',
            description: `+${tournament.participants.length - 5} more participants joined`,
            icon: <Users size={16} />,
            color: 'text-blue-400'
          });
        }

        // Completed Matches
        tournament.matches
          .filter(m => m.winner)
          .forEach(match => {
            const winnerName = getParticipantName(match.winner!, tournament.participants);
            const loserName = match.winner === match.participant1
              ? getParticipantName(match.participant2, tournament.participants)
              : getParticipantName(match.participant1, tournament.participants);

            items.push({
              id: `match-${match.id}`,
              type: 'match_completed',
              timestamp: match.completedAt || tournament.createdAt,
              title: `Match Completed - ${match.round.charAt(0).toUpperCase() + match.round.slice(1)}`,
              description: `${winnerName} defeated ${loserName}`,
              icon: <CheckCircle size={16} />,
              color: 'text-green-400'
            });
          });

        // Bets Created & Settled
        const bets = await getTournamentBets(tournament.id);

        bets.forEach(bet => {
          // Bet Created
          items.push({
            id: `bet-created-${bet.id}`,
            type: 'bet_created',
            timestamp: bet.createdAt,
            title: bet.isStandard ? 'Standard Bet Created' : 'Custom Bet Created',
            description: bet.title,
            icon: <DollarSign size={16} />,
            color: bet.isStandard ? 'text-[#ff6b35]' : 'text-purple-400'
          });

          // Bet Settled
          if (bet.status === 'settled' && bet.settledAt) {
            const winnerCount = bet.winnerIds?.length || 0;
            items.push({
              id: `bet-settled-${bet.id}`,
              type: 'bet_settled',
              timestamp: bet.settledAt,
              title: 'Bet Settled',
              description: `${bet.title} - ${winnerCount} winner${winnerCount !== 1 ? 's' : ''}`,
              icon: <Trophy size={16} />,
              color: 'text-green-400'
            });
          }
        });

        // Sort by timestamp (most recent first)
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setActivities(items);
      } catch (err) {
        console.error('Error building activity feed:', err);
      } finally {
        setLoading(false);
      }
    }

    buildActivityFeed();
  }, [tournament]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
        <p className="text-zinc-400">Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
        <MessageSquare className="mx-auto mb-2 text-zinc-600" size={24} />
        <p className="text-zinc-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Activity Feed
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`px-4 py-3 flex gap-3 ${
              index !== activities.length - 1 ? 'border-b border-zinc-800' : ''
            } hover:bg-zinc-800/50 transition-colors`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center ${activity.color}`}>
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white mb-0.5">
                {activity.title}
              </div>
              <div className="text-sm text-zinc-400 line-clamp-2">
                {activity.description}
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex-shrink-0 flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={12} />
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
