"use client";

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { createTournament } from '@/services/tournamentService';
import { CreateTournamentInput } from '@/types/tournament';

interface CreateTournamentWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTournamentWizard({ isOpen, onClose }: CreateTournamentWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form state
  const [tournamentName, setTournamentName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tournamentType, setTournamentType] = useState<"single" | "double">("single");
  const [bracketSize, setBracketSize] = useState(8);
  const [isPublic, setIsPublic] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  // Submission state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;

    if (!user) {
      setError('You must be logged in to create a tournament');
      return;
    }

    // Validation
    if (!tournamentName.trim()) {
      setError('Tournament name is required');
      return;
    }

    if (!startDate || !startTime) {
      setError('Start date and time are required');
      return;
    }

    if (!endDate || !endTime) {
      setError('End date and time are required');
      return;
    }

    if (bracketSize < 4) {
      setError('Bracket size must be at least 4');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const now = new Date();

    if (startDateTime < now) {
      setError('Start date must be in the future');
      return;
    }

    if (endDateTime <= startDateTime) {
      setError('End date must be after start date');
      return;
    }

    // Check 90 day limit
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    if (startDateTime > ninetyDaysFromNow) {
      setError('Tournament cannot be created more than 90 days in advance');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const input: CreateTournamentInput = {
        name: tournamentName,
        description: description || undefined,
        startDate,
        startTime,
        endDate,
        endTime,
        type: tournamentType,
        bracketSize,
        isPublic,
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Unknown',
      };

      const tournamentId = await createTournament(input);
      console.log('Tournament created:', tournamentId);

      // Reset form
      setTournamentName('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setTournamentType('single');
      setBracketSize(8);
      setIsPublic(false);
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
            className="text-zinc-400 hover:text-white transition-colors"
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
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35]"
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
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Start Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
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
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
                />
              </div>
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
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
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
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
                />
              </div>
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
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      tournamentType === "single"
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Single Elimination
                  </button>
                  <button
                    onClick={() => setTournamentType("double")}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
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
                  Bracket Size * (4 or more)
                </label>
                <input
                  type="number"
                  min="4"
                  value={bracketSize}
                  onChange={(e) => setBracketSize(parseInt(e.target.value) || 4)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Can be any size 4 or larger. Play-in games will be added automatically.
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
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      !isPublic
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Private
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
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
                    : "Only invited users can view and bet on this tournament"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Add Participants (placeholder for now) */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2 font-montserrat">
                  Add Participants
                </label>
                <p className="text-sm text-zinc-400 mb-4">
                  Participant management coming soon. For now, you can add participants after creating the tournament.
                </p>
                <div className="bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-zinc-500 text-sm">
                    {bracketSize} participant slots available
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
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
              className="flex items-center gap-2 bg-[#ff6b35] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#ff8555] transition-colors"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isCreating}
              className="bg-[#ff6b35] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#ff8555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Tournament'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
