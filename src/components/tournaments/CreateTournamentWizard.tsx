"use client";

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, UserPlus, Search, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { auth, db } from '@/lib/firebase/client';
import { createTournament } from '@/services/tournamentService';
import { CreateTournamentInput, Participant } from '@/types/tournament';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface CreateTournamentWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParticipantEntry {
  userId: string;
  userName: string;
  email?: string;
  seed: number;
}

interface SearchUser {
  id: string;
  displayName: string;
  email: string;
}

export function CreateTournamentWizard({ isOpen, onClose }: CreateTournamentWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form state
  const [tournamentName, setTournamentName] = useState("");
  const [description, setDescription] = useState("");
  const [startImmediately, setStartImmediately] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tournamentType, setTournamentType] = useState<"single" | "double">("single");
  const [bracketSize, setBracketSize] = useState(8);
  const [isPublic, setIsPublic] = useState(false);
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);

  // Modal states
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [showAssignSeeds, setShowAssignSeeds] = useState(false);

  // Submission state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateStep = (): boolean => {
    setError(null);

    switch (step) {
      case 1: // Basic Info
        if (!tournamentName.trim()) {
          setError('Tournament name is required');
          return false;
        }
        if (tournamentName.length < 3) {
          setError('Tournament name must be at least 3 characters');
          return false;
        }
        if (tournamentName.length > 100) {
          setError('Tournament name must be less than 100 characters');
          return false;
        }
        break;

      case 2: // Start Date & Time
        if (!startImmediately) {
          if (!startDate || !startTime) {
            setError('Start date and time are required');
            return false;
          }
          const start = new Date(`${startDate}T${startTime}`);
          const now = new Date();

          if (start < now) {
            setError('Start time must be in the future');
            return false;
          }

          // Check 90 day limit
          const ninetyDaysFromNow = new Date();
          ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
          if (start > ninetyDaysFromNow) {
            setError('Tournament cannot be created more than 90 days in advance');
            return false;
          }
        }
        break;

      case 3: // End Date & Time
        if (!endDate || !endTime) {
          setError('End date and time are required');
          return false;
        }

        const startDateTime = startImmediately
          ? new Date()
          : new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (endDateTime <= startDateTime) {
          setError('End time must be after start time');
          return false;
        }

        // Max 30 days duration
        const maxDuration = 30 * 24 * 60 * 60 * 1000;
        if (endDateTime.getTime() - startDateTime.getTime() > maxDuration) {
          setError('Tournament cannot last more than 30 days');
          return false;
        }
        break;

      case 4: // Tournament Type
        if (!tournamentType) {
          setError('Please select tournament type');
          return false;
        }
        if (bracketSize < 4) {
          setError('Bracket size must be at least 4');
          return false;
        }
        if (bracketSize > 64) {
          setError('Bracket size cannot exceed 64');
          return false;
        }
        break;

      case 5: // Privacy (always valid, defaults to private)
        break;

      case 6: // Participants
        if (participants.length < 2) {
          setError('At least 2 participants are required');
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < totalSteps) setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  const handleAddParticipant = (userId: string, userName: string, email?: string) => {
    if (participants.length >= bracketSize) {
      setError('Tournament is full');
      return;
    }

    if (participants.some(p => p.userId === userId)) {
      setError('User already added');
      return;
    }

    setParticipants([
      ...participants,
      {
        userId,
        userName,
        email,
        seed: participants.length + 1
      }
    ]);
    setError(null);
  };

  const handleRemoveParticipant = (userId: string) => {
    const updated = participants.filter(p => p.userId !== userId);
    // Reassign seeds
    updated.forEach((p, index) => {
      p.seed = index + 1;
    });
    setParticipants(updated);
  };

  const handleMoveSeedUp = (index: number) => {
    if (index === 0) return;
    const updated = [...participants];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update seeds
    updated.forEach((p, i) => {
      p.seed = i + 1;
    });
    setParticipants(updated);
  };

  const handleMoveSeedDown = (index: number) => {
    if (index === participants.length - 1) return;
    const updated = [...participants];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update seeds
    updated.forEach((p, i) => {
      p.seed = i + 1;
    });
    setParticipants(updated);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    const user = auth.currentUser;

    if (!user) {
      setError('You must be logged in to create a tournament');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Determine start date/time based on immediate start
      const now = new Date();
      const actualStartDate = startImmediately ? now.toISOString().split('T')[0] : startDate;
      const actualStartTime = startImmediately ? now.toTimeString().slice(0, 5) : startTime;

      const input: CreateTournamentInput = {
        name: tournamentName,
        description: description || undefined,
        startDate: actualStartDate,
        startTime: actualStartTime,
        endDate,
        endTime,
        type: tournamentType,
        bracketSize,
        isPublic,
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Unknown',
        participants: participants.map(p => ({
          userId: p.userId,
          userName: p.userName,
          seed: p.seed,
          eliminated: false,
          currentRound: 'round1' as const
        })),
        startImmediately
      };

      const tournamentId = await createTournament(input);
      console.log('Tournament created:', tournamentId);

      // Reset form
      setTournamentName('');
      setDescription('');
      setStartImmediately(false);
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setTournamentType('single');
      setBracketSize(8);
      setIsPublic(false);
      setParticipants([]);
      setStep(1);

      onClose();
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError('Failed to create tournament. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-montserrat">
            Create Tournament
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors touch-manipulation p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400 font-montserrat">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-zinc-400 font-montserrat">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-[#ff6b35] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="px-6 py-6">
          {/* Step 1: Tournament Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g., Beer Pong Championship"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional tournament description..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] resize-none text-base"
                />
              </div>
            </div>
          )}

          {/* Step 2: Start Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Start Immediately Option */}
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-[#ff6b35] transition-colors">
                  <input
                    type="checkbox"
                    checked={startImmediately}
                    onChange={(e) => setStartImmediately(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-[#ff6b35] focus:ring-[#ff6b35] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#ff6b35]" />
                      <span className="text-sm text-white font-medium">Start tournament immediately</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tournament will be created in "LIVE" status and ready for match results
                    </p>
                  </div>
                </label>
              </div>

              {/* Show date/time inputs only if NOT starting immediately */}
              {!startImmediately && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35] text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35] text-base"
                    />
                  </div>
                </>
              )}

              {startImmediately && (
                <div className="p-4 bg-[#ff6b35]/10 border border-[#ff6b35]/30 rounded-lg">
                  <p className="text-sm text-[#ff6b35]">
                    Tournament will start now. You can begin entering match results immediately after creation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: End Date & Time */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35] text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35] text-base"
                />
              </div>

              <p className="text-xs text-zinc-500">
                This is when the tournament must be completed by. Results can still be entered until this time.
              </p>
            </div>
          )}

          {/* Step 4: Tournament Type & Bracket Size */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Tournament Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTournamentType("single")}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
                      tournamentType === "single"
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Single Elimination
                  </button>
                  <button
                    onClick={() => setTournamentType("double")}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
                      tournamentType === "double"
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Double Elimination
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Bracket Size * (4 - 64)
                </label>
                <input
                  type="number"
                  min="4"
                  max="64"
                  value={bracketSize}
                  onChange={(e) => setBracketSize(parseInt(e.target.value) || 4)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35] text-base"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Can be any size 4-64. Play-in games will be added automatically for non-power-of-2 sizes.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Privacy */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Tournament Privacy *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
                      !isPublic
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Private
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
                      isPublic
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Public
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {isPublic
                    ? "Anyone can view and bet on this tournament"
                    : "Only invited users can view and bet on this tournament. An access code will be generated."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Add Participants */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-white font-montserrat">
                  Participants ({participants.length}/{bracketSize})
                </label>
                <button
                  onClick={() => setShowAddParticipants(true)}
                  disabled={participants.length >= bracketSize}
                  className="flex items-center gap-2 px-3 py-2 bg-[#ff6b35] hover:bg-[#ff8555] disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors touch-manipulation"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {participants.length > 0 ? (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {participants.map((p, index) => (
                      <div key={p.userId} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                        {/* Seed number */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6b35]/20 text-[#ff6b35] font-bold text-sm flex-shrink-0">
                          {p.seed}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.userName}</p>
                          {p.email && (
                            <p className="text-xs text-zinc-500 truncate">{p.email}</p>
                          )}
                        </div>

                        {/* Move buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleMoveSeedUp(index)}
                            disabled={index === 0}
                            className="p-2 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors touch-manipulation"
                          >
                            <ArrowUp className="w-4 h-4 text-zinc-400" />
                          </button>
                          <button
                            onClick={() => handleMoveSeedDown(index)}
                            disabled={index === participants.length - 1}
                            className="p-2 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors touch-manipulation"
                          >
                            <ArrowDown className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveParticipant(p.userId)}
                          className="p-2 hover:bg-zinc-700 rounded transition-colors touch-manipulation"
                        >
                          <X className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-500">
                    Drag participants up/down to change seeds. Seed #1 is the highest ranked.
                  </p>
                </>
              ) : (
                <div className="text-center py-8 bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-500">No participants added yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Add at least 2 participants to create the tournament</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
              step === 1
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ChevronLeft size={20} />
            Back
          </button>

          {step < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#ff6b35] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#ff8555] transition-colors touch-manipulation"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isCreating || participants.length < 2}
              className="bg-[#ff6b35] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#ff8555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isCreating ? 'Creating...' : 'Create Tournament'}
            </button>
          )}
        </div>
      </div>

      {/* Add Participants Modal */}
      {showAddParticipants && (
        <AddParticipantsModal
          onClose={() => setShowAddParticipants(false)}
          onAddParticipant={handleAddParticipant}
          currentParticipants={participants.map(p => p.userId)}
          maxParticipants={bracketSize}
        />
      )}
    </div>
  );
}

// Add Participants Modal Component
function AddParticipantsModal({
  onClose,
  onAddParticipant,
  currentParticipants,
  maxParticipants
}: {
  onClose: () => void;
  onAddParticipant: (userId: string, userName: string, email?: string) => void;
  currentParticipants: string[];
  maxParticipants: number;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);

  const spotsRemaining = maxParticipants - currentParticipants.length;

  // Search users
  const handleSearch = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);

      // Search by displayName
      const searchQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', queryStr),
        where('displayName', '<=', queryStr + '\uf8ff'),
        limit(10)
      );

      const nameResults = await getDocs(searchQuery);

      const users: SearchUser[] = [];
      nameResults.forEach(doc => {
        const data = doc.data();
        // Filter out users already in tournament
        if (!currentParticipants.includes(doc.id)) {
          users.push({
            id: doc.id,
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
            email: data.email || ''
          });
        }
      });

      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const debounce = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentParticipants]);

  const handleAddManual = () => {
    if (!manualName.trim()) return;

    // Generate a temporary ID for manual entries
    const tempId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onAddParticipant(tempId, manualName.trim());
    setManualName('');
    setShowManualAdd(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Add Participants</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors touch-manipulation"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Spots remaining */}
        <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">
            Spots remaining: <span className="text-[#ff6b35] font-semibold">{spotsRemaining}</span>
          </p>
        </div>

        {/* Toggle buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowManualAdd(false)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
              !showManualAdd
                ? 'bg-[#ff6b35] text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Search Users
          </button>
          <button
            onClick={() => setShowManualAdd(true)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
              showManualAdd
                ? 'bg-[#ff6b35] text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {!showManualAdd ? (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] text-base"
                />
              </div>
            </div>

            {/* Search results */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loading && (
                <p className="text-sm text-zinc-500 text-center py-4">Searching...</p>
              )}

              {!loading && searchResults.length === 0 && searchQuery && (
                <p className="text-sm text-zinc-500 text-center py-4">No users found</p>
              )}

              {searchResults.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                    {user.email && (
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onAddParticipant(user.id, user.displayName, user.email);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    disabled={spotsRemaining <= 0}
                    className="flex items-center gap-1 px-3 py-2 bg-[#ff6b35] hover:bg-[#ff8555] disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors ml-2 touch-manipulation"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Manual entry */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Participant Name
              </label>
              <input
                type="text"
                placeholder="Enter name..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] text-base"
              />
            </div>

            <button
              onClick={handleAddManual}
              disabled={!manualName.trim() || spotsRemaining <= 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ff6b35] hover:bg-[#ff8555] disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors touch-manipulation"
            >
              <UserPlus className="w-4 h-4" />
              Add Participant
            </button>

            <p className="text-xs text-zinc-500 text-center">
              Manual entries will appear without a linked user account
            </p>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors touch-manipulation"
        >
          Done
        </button>
      </div>
    </div>
  );
}
