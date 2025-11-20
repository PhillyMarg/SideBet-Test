"use client";

import { useState } from 'react';
import type { WizardTheme, BetType, WizardData } from '../BetWizard';

interface Step3Props {
  theme: WizardTheme;
  selectedTarget?: string;
  onNext: (data: Partial<WizardData>) => void;
  onBack: () => void;
}

export function Step3BetType({ theme, selectedTarget, onNext, onBack }: Step3Props) {
  const [selected, setSelected] = useState<BetType | null>(null);

  const themeColor = theme === 'group' ? '#FF6B35' : '#A855F7';

  const betTypes = [
    {
      type: 'YES_NO' as BetType,
      title: 'Yes/No',
      description: 'Simple Yes or No Outcome'
    },
    {
      type: 'OVER_UNDER' as BetType,
      title: 'Over/Under',
      description: 'Set a Line, Pick Over or Under'
    },
    {
      type: 'CLOSEST_GUESS' as BetType,
      title: 'Closest Guess',
      description: 'Exact Number, Winner is Closest'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Selected Target Display */}
      {selectedTarget && (
        <div className="flex justify-center">
          <span
            className="text-sm font-montserrat font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${themeColor}20`,
              color: themeColor
            }}
          >
            {selectedTarget}
          </span>
        </div>
      )}

      <h2 className="text-xl font-montserrat font-bold text-white text-center">
        What Type of Bet?
      </h2>

      {/* Bet Type Options */}
      <div className="space-y-3">
        {betTypes.map(betType => (
          <button
            key={betType.type}
            onClick={() => setSelected(betType.type)}
            className={`
              w-full p-4 rounded-lg border-2 text-left
              transition-all
              ${selected === betType.type
                ? 'bg-opacity-10'
                : 'bg-transparent border-zinc-800 hover:border-zinc-700'
              }
            `}
            style={{
              borderColor: selected === betType.type ? themeColor : '#27272A',
              backgroundColor: selected === betType.type ? `${themeColor}10` : 'transparent'
            }}
          >
            <p
              className="font-montserrat font-semibold text-sm mb-1"
              style={{ color: selected === betType.type ? themeColor : 'white' }}
            >
              {betType.title}
            </p>
            <p className="text-xs text-zinc-400">
              {betType.description}
            </p>
          </button>
        ))}
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
          onClick={() => selected && onNext({ betType: selected })}
          disabled={!selected}
          className="
            flex-1 bg-[#8B4513] text-white py-3 rounded-lg
            font-montserrat font-semibold
            hover:bg-[#9B5523] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Next
        </button>
      </div>
    </div>
  );
}
