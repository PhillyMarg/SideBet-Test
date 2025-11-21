"use client";

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { createTournamentBet } from '@/services/tournamentBetService';
import { useAuth } from '@/contexts/AuthContext';

interface CreateCustomBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onBetCreated: () => void;
}

export function CreateCustomBetModal({
  isOpen,
  onClose,
  tournament,
  onBetCreated
}: CreateCustomBetModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wagerAmount, setWagerAmount] = useState(10);
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateStep1 = () => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    const filledOptions = options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      setError("At least 2 options are required");
      return false;
    }
    if (new Set(filledOptions).size !== filledOptions.length) {
      setError("Options must be unique");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = () => {
    if (wagerAmount < 1) {
      setError("Wager must be at least $1");
      return false;
    }
    if (!closesAt) {
      setError("Closing time is required");
      return false;
    }
    const closingDate = new Date(closesAt);
    if (closingDate <= new Date()) {
      setError("Closing time must be in the future");
      return false;
    }
    if (closingDate > new Date(tournament.endDate)) {
      setError("Closing time cannot be after tournament ends");
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    let isValid = false;

    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();

    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setError(null);
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3() || !user) return;

    try {
      setCreating(true);
      setError(null);

      const filledOptions = options.filter(o => o.trim());

      await createTournamentBet({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        type: 'custom',
        title,
        description: description || undefined,
        wagerAmount,
        closesAt,
        options: filledOptions,
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Unknown'
      });

      // Reset form
      setTitle("");
      setDescription("");
      setWagerAmount(10);
      setClosesAt("");
      setOptions(["", ""]);
      setStep(1);

      onBetCreated();
      onClose();

    } catch (err: any) {
      console.error('Error creating bet:', err);
      setError(err.message || 'Failed to create bet');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-white font-montserrat">
            Create Custom Bet
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors touch-manipulation"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Step {step} of {totalSteps}</span>
            <span className="text-sm text-zinc-400">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-[#ff6b35] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Bet Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Most upsets in Round 1?"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35]"
                  maxLength={100}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {title.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details about this bet..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35] resize-none"
                  maxLength={300}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {description.length}/300 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Options */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Betting Options * (2-10 options)
                </label>
                <p className="text-xs text-zinc-400 mb-3">
                  What can people bet on?
                </p>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b35]"
                      maxLength={50}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-manipulation"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  onClick={handleAddOption}
                  className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-[#ff6b35] rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Plus size={16} />
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Wager Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(parseInt(e.target.value) || 1)}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Everyone pays the same amount to participate
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Betting Closes At *
                </label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  max={tournament.endDate.slice(0, 16)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b35]"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Must be between now and tournament end ({new Date(tournament.endDate).toLocaleDateString()})
                </p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> You will be responsible for judging this bet and declaring the winner after it closes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors touch-manipulation ${
              step === 1
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
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
              disabled={creating}
              className="bg-[#ff6b35] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#ff8555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {creating ? 'Creating...' : 'Create Bet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
