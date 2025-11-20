"use client";

import type { WizardData } from '../BetWizard';

interface Step6Props {
  wizardData: WizardData;
  onConfirm: (data: Partial<WizardData>) => void;
  onBack: () => void;
}

export function Step6Confirmation({ wizardData, onConfirm, onBack }: Step6Props) {
  const themeColor = wizardData.theme === 'group' ? '#FF6B35' : '#A855F7';

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getBetTypeLabel = () => {
    switch (wizardData.betType) {
      case 'YES_NO': return 'Yes/No';
      case 'OVER_UNDER': return 'Over/Under';
      case 'CLOSEST_GUESS': return 'Closest Guess';
      default: return '';
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-montserrat font-bold text-white text-center">
        Confirm Bet Details
      </h2>

      {/* Bet Summary Card */}
      <div
        className="rounded-lg p-4 space-y-3"
        style={{ backgroundColor: '#27272A' }}
      >
        {/* Target */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-montserrat text-zinc-400">
            {wizardData.theme === 'group' ? 'Group' : 'Friend'}
          </span>
          <span
            className="text-sm font-montserrat font-semibold"
            style={{ color: themeColor }}
          >
            {wizardData.targetName}
          </span>
        </div>

        {/* Bet Type */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-montserrat text-zinc-400">
            Type
          </span>
          <span className="text-sm font-montserrat font-semibold text-white">
            {getBetTypeLabel()}
          </span>
        </div>

        {/* Title */}
        <div className="flex justify-between items-start">
          <span className="text-xs font-montserrat text-zinc-400">
            Title
          </span>
          <span className="text-sm font-montserrat font-semibold text-white text-right max-w-[60%]">
            {wizardData.title}
          </span>
        </div>

        {/* Description */}
        {wizardData.description && (
          <div className="flex justify-between items-start">
            <span className="text-xs font-montserrat text-zinc-400">
              Description
            </span>
            <span className="text-sm font-montserrat text-zinc-300 text-right max-w-[60%]">
              {wizardData.description}
            </span>
          </div>
        )}

        {/* Line (O/U) */}
        {wizardData.line && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-montserrat text-zinc-400">
              Line
            </span>
            <span className="text-sm font-montserrat font-semibold text-white">
              {wizardData.line}
            </span>
          </div>
        )}

        {/* Wager */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-montserrat text-zinc-400">
            Wager
          </span>
          <span
            className="text-sm font-montserrat font-bold"
            style={{ color: themeColor }}
          >
            ${wizardData.wagerAmount?.toFixed(2)}
          </span>
        </div>

        {/* Closing Date */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-montserrat text-zinc-400">
            Closes
          </span>
          <span className="text-sm font-montserrat font-semibold text-white">
            {formatDate(wizardData.closingDate)}
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="
            flex-1 border-2 border-zinc-800 text-white py-3 rounded-lg
            font-montserrat font-semibold
            hover:bg-zinc-800 transition-colors
          "
        >
          Back
        </button>
        <button
          onClick={() => onConfirm({})}
          className="
            flex-1 bg-[#8B4513] text-white py-3 rounded-lg
            font-montserrat font-semibold
            hover:bg-[#9B5523] transition-colors
          "
        >
          Create Bet
        </button>
      </div>
    </div>
  );
}
