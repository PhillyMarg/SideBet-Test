"use client";

import { useState } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { searchUsers, UserSearchResult } from '@/services/userService';
import { addParticipant } from '@/services/tournamentService';

interface AddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onParticipantAdded: () => void;
}

export function AddParticipantsModal({
  isOpen,
  onClose,
  tournament,
  onParticipantAdded
}: AddParticipantsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const results = await searchUsers(query);

      // Filter out users already in tournament
      const participantIds = tournament.participants.map(p => p.userId);
      const filteredResults = results.filter(r => !participantIds.includes(r.uid));

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleAddParticipant = async (user: UserSearchResult) => {
    if (tournament.participants.length >= tournament.maxParticipants) {
      setError('Tournament is full');
      return;
    }

    try {
      setAdding(user.uid);
      setError(null);

      await addParticipant(tournament.id, user.uid, user.displayName);

      // Remove from search results
      setSearchResults(prev => prev.filter(r => r.uid !== user.uid));
      setSearchQuery("");

      // Notify parent to refresh
      onParticipantAdded();

    } catch (err: any) {
      console.error('Error adding participant:', err);
      setError(err.message || 'Failed to add participant');
    } finally {
      setAdding(null);
    }
  };

  const spotsRemaining = tournament.maxParticipants - tournament.participants.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white font-montserrat">
              Add Participants
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35]"
              autoFocus
            />
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {searching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-zinc-400" size={24} />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">
                {searchQuery.trim()
                  ? 'No users found'
                  : 'Search for users to add to the tournament'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.uid}
                  className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">
                      {user.displayName}
                    </div>
                    <div className="text-zinc-400 text-xs">
                      {user.email}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddParticipant(user)}
                    disabled={adding === user.uid || spotsRemaining === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#ff6b35] hover:bg-[#ff8555] text-white rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding === user.uid ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
