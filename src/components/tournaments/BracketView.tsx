"use client";

import { useState, useEffect } from 'react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tournament, Match, BracketRound } from '@/types/tournament';
import { getParticipantName } from '@/services/bracketService';

interface BracketViewProps {
  tournament: Tournament;
  onMatchClick?: (match: Match) => void;
}

export function BracketView({ tournament, onMatchClick }: BracketViewProps) {
  const { matches, participants } = tournament;
  const [isMobile, setIsMobile] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<BracketRound, Match[]>);

  const roundOrder: BracketRound[] = ['round1', 'round2', 'round3', 'semifinals', 'finals'];
  const activeRounds = roundOrder.filter(round => matchesByRound[round]?.length > 0);

  const getRoundLabel = (round: BracketRound): string => {
    switch (round) {
      case 'round1': return 'Round 1';
      case 'round2': return 'Round 2';
      case 'round3': return 'Round 3';
      case 'semifinals': return 'Semifinals';
      case 'finals': return 'Finals';
    }
  };

  if (matches.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center">
        <p className="text-zinc-400">No bracket generated yet</p>
        <p className="text-zinc-500 text-sm mt-2">
          The tournament director needs to generate the bracket
        </p>
      </div>
    );
  }

  // Mobile view with navigation
  if (isMobile && activeRounds.length > 2) {
    const visibleRounds = activeRounds.slice(currentRoundIndex, currentRoundIndex + 2);

    return (
      <div>
        {/* Mobile Navigation Controls */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))}
            disabled={currentRoundIndex === 0}
            className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors touch-manipulation flex items-center justify-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="px-3 py-3 bg-zinc-900 rounded-lg border border-zinc-800 min-w-[100px] text-center">
            <span className="text-zinc-400 text-sm">
              {currentRoundIndex + 1}-{Math.min(currentRoundIndex + 2, activeRounds.length)} of {activeRounds.length}
            </span>
          </div>
          <button
            onClick={() => setCurrentRoundIndex(Math.min(activeRounds.length - 2, currentRoundIndex + 1))}
            disabled={currentRoundIndex >= activeRounds.length - 2}
            className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors touch-manipulation flex items-center justify-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Mobile Bracket View */}
        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-4 min-w-max p-2">
            {visibleRounds.map((round) => (
              <div key={round} className="flex flex-col gap-4 min-w-[240px]">
                {/* Round Header */}
                <div className="text-center mb-2">
                  <h3 className="text-sm font-bold text-white font-montserrat uppercase">
                    {getRoundLabel(round)}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {matchesByRound[round].length} {matchesByRound[round].length === 1 ? 'match' : 'matches'}
                  </p>
                </div>

                {/* Matches in this round */}
                <div className="flex flex-col gap-4 justify-center flex-1">
                  {matchesByRound[round]
                    .sort((a, b) => a.matchNumber - b.matchNumber)
                    .map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        tournament={tournament}
                        onClick={() => onMatchClick?.(match)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop/tablet view
  return (
    <div className="overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex gap-6 min-w-max p-4">
        {activeRounds.map((round) => (
          <div key={round} className="flex flex-col gap-4">
            {/* Round Header */}
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-white font-montserrat uppercase">
                {getRoundLabel(round)}
              </h3>
              <p className="text-xs text-zinc-500">
                {matchesByRound[round].length} {matchesByRound[round].length === 1 ? 'match' : 'matches'}
              </p>
            </div>

            {/* Matches in this round */}
            <div className="flex flex-col gap-4 justify-center flex-1">
              {matchesByRound[round]
                .sort((a, b) => a.matchNumber - b.matchNumber)
                .map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tournament={tournament}
                    onClick={() => onMatchClick?.(match)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  tournament: Tournament;
  onClick?: () => void;
}

function MatchCard({ match, tournament, onClick }: MatchCardProps) {
  const participant1Name = match.participant1
    ? getParticipantName(match.participant1, tournament.participants)
    : 'TBD';
  const participant2Name = match.participant2
    ? getParticipantName(match.participant2, tournament.participants)
    : 'TBD';

  const isCompleted = !!match.winner;
  const isBye = match.participant1 === match.participant2 && match.participant1 !== '';
  const isPlayIn = match.isPlayIn;

  return (
    <div
      onClick={onClick}
      className={`
        w-64 bg-zinc-800 rounded-lg border transition-all cursor-pointer
        min-h-[120px]
        touch-manipulation
        active:bg-zinc-700
        ${isCompleted
          ? 'border-green-500/50 hover:border-green-500'
          : 'border-zinc-700 hover:border-[#ff6b35]'
        }
        ${isPlayIn ? 'ring-1 ring-yellow-500/30' : ''}
      `}
    >
      {/* Match Header */}
      <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Match #{match.matchNumber}
          {isPlayIn && (
            <span className="ml-2 text-yellow-500">(Play-in)</span>
          )}
        </span>
        {isCompleted && (
          <Trophy className="text-green-500" size={12} />
        )}
      </div>

      {/* Participants */}
      <div className="p-2 space-y-1">
        {/* Participant 1 */}
        <div
          className={`
            px-3 py-2 rounded flex items-center justify-between
            ${match.winner === match.participant1
              ? 'bg-green-500/10 border border-green-500/50'
              : isCompleted
              ? 'bg-zinc-900/50 text-zinc-500'
              : 'bg-zinc-900'
            }
          `}
        >
          <span className={`text-sm truncate ${
            !match.participant1 ? 'text-zinc-500 italic' : 'text-white'
          }`}>
            {participant1Name}
          </span>
          {match.winner === match.participant1 && (
            <Trophy className="text-green-500 flex-shrink-0 ml-2" size={14} />
          )}
        </div>

        {/* VS Indicator */}
        <div className="text-center text-xs text-zinc-600">vs</div>

        {/* Participant 2 */}
        <div
          className={`
            px-3 py-2 rounded flex items-center justify-between
            ${match.winner === match.participant2
              ? 'bg-green-500/10 border border-green-500/50'
              : isCompleted
              ? 'bg-zinc-900/50 text-zinc-500'
              : 'bg-zinc-900'
            }
          `}
        >
          <span className={`text-sm truncate ${
            !match.participant2 ? 'text-zinc-500 italic' : 'text-white'
          }`}>
            {participant2Name}
          </span>
          {match.winner === match.participant2 && (
            <Trophy className="text-green-500 flex-shrink-0 ml-2" size={14} />
          )}
        </div>
      </div>

      {/* Bye Indicator */}
      {isBye && (
        <div className="px-3 py-2 border-t border-zinc-700">
          <span className="text-xs text-blue-400">Bye - Auto Advance</span>
        </div>
      )}
    </div>
  );
}
