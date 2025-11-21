"use client";

import { useState } from 'react';
import { X, Trophy, Undo2, Loader2 } from 'lucide-react';
import { Match, Tournament } from '@/types/tournament';
import { getParticipantName, enterMatchResult, undoMatchResult, canEnterResult } from '@/services/bracketService';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  tournament: Tournament;
  isDirector: boolean;
  onResultEntered: () => void;
}

export function MatchDetailsModal({
  isOpen,
  onClose,
  match,
  tournament,
  isDirector,
  onResultEntered
}: MatchDetailsModalProps) {
  const [entering, setEntering] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const participant1Name = match.participant1
    ? getParticipantName(match.participant1, tournament.participants)
    : 'TBD';
  const participant2Name = match.participant2
    ? getParticipantName(match.participant2, tournament.participants)
    : 'TBD';

  const isCompleted = !!match.winner;
  const canEnter = canEnterResult(match);
  const isBye = match.participant1 === match.participant2 && match.participant1 !== '';

  const getRoundLabel = (): string => {
    if (match.isPlayIn) return 'Play-In Game';
    switch (match.round) {
      case 'round1': return 'Round 1';
      case 'round2': return 'Round 2';
      case 'round3': return 'Round 3';
      case 'semifinals': return 'Semifinals';
      case 'finals': return 'Finals';
    }
  };

  const handleEnterResult = async (winnerId: string) => {
    if (!isDirector) return;

    try {
      setEntering(true);
      setError(null);

      await enterMatchResult(tournament.id, match.id, winnerId);

      onResultEntered();
      onClose();
    } catch (err: any) {
      console.error('Error entering result:', err);
      setError(err.message || 'Failed to enter result');
    } finally {
      setEntering(false);
    }
  };

  const handleUndoResult = async () => {
    if (!isDirector || !isCompleted) return;

    if (!confirm('Undo this match result? The winner will be removed from the next round.')) {
      return;
    }

    try {
      setUndoing(true);
      setError(null);

      await undoMatchResult(tournament.id, match.id);

      onResultEntered();
      onClose();
    } catch (err: any) {
      console.error('Error undoing result:', err);
      setError(err.message || 'Failed to undo result');
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-montserrat">
              {getRoundLabel()}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Match #{match.matchNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Match Content */}
        <div className="px-6 py-6">
          {/* Status Message */}
          {isBye && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                This participant has a bye and automatically advances
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <Trophy className="text-green-500" size={16} />
              <p className="text-sm text-green-400">
                Match completed
              </p>
            </div>
          )}

          {!canEnter && !isCompleted && !isBye && (
            <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-sm text-zinc-400">
                Waiting for previous matches to complete
              </p>
            </div>
          )}

          {/* Participant 1 */}
          <div
            className={`
              p-4 rounded-lg border-2 mb-3 transition-all
              ${match.winner === match.participant1
                ? 'bg-green-500/10 border-green-500'
                : isCompleted
                ? 'bg-zinc-800 border-zinc-700 opacity-50'
                : 'bg-zinc-800 border-zinc-700 hover:border-[#ff6b35]'
              }
              ${isDirector && canEnter && !entering ? 'cursor-pointer' : ''}
            `}
            onClick={() => {
              if (isDirector && canEnter && !entering && match.participant1) {
                handleEnterResult(match.participant1);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${
                match.winner === match.participant1 ? 'text-white' : 'text-zinc-300'
              }`}>
                {participant1Name}
              </span>
              {match.winner === match.participant1 && (
                <Trophy className="text-green-500" size={20} />
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-center text-zinc-600 text-sm mb-3">vs</div>

          {/* Participant 2 */}
          <div
            className={`
              p-4 rounded-lg border-2 transition-all
              ${match.winner === match.participant2
                ? 'bg-green-500/10 border-green-500'
                : isCompleted
                ? 'bg-zinc-800 border-zinc-700 opacity-50'
                : 'bg-zinc-800 border-zinc-700 hover:border-[#ff6b35]'
              }
              ${isDirector && canEnter && !entering ? 'cursor-pointer' : ''}
            `}
            onClick={() => {
              if (isDirector && canEnter && !entering && match.participant2) {
                handleEnterResult(match.participant2);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${
                match.winner === match.participant2 ? 'text-white' : 'text-zinc-300'
              }`}>
                {participant2Name}
              </span>
              {match.winner === match.participant2 && (
                <Trophy className="text-green-500" size={20} />
              )}
            </div>
          </div>

          {/* Instructions for Director */}
          {isDirector && canEnter && !entering && (
            <div className="mt-4 text-center">
              <p className="text-sm text-zinc-500">
                Click on the winner to enter result
              </p>
            </div>
          )}

          {/* Loading State */}
          {entering && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#ff6b35]">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm">Entering result...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div>
            {isDirector && isCompleted && (
              <button
                onClick={handleUndoResult}
                disabled={undoing}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {undoing ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Undo2 size={14} />
                )}
                Undo Result
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
