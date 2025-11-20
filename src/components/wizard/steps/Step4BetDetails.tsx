"use client";

import { useState } from 'react';
import type { WizardTheme, BetType, WizardData } from '../BetWizard';

interface Step4Props {
  theme: WizardTheme;
  betType: BetType;
  selectedTarget?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialLine?: number;
  onNext: (data: Partial<WizardData>) => void;
  onBack: () => void;
}

export function Step4BetDetails({
  theme,
  betType,
  selectedTarget,
  initialTitle,
  initialDescription,
  initialLine,
  onNext,
  onBack
}: Step4Props) {
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [line, setLine] = useState(initialLine?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const themeColor = theme === 'group' ? '#FF6B35' : '#A855F7';
  const isOverUnder = betType === 'OVER_UNDER';

  const validateLine = (value: string): boolean => {
    if (!value) return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    // Must end in .5
    const decimalPart = value.split('.')[1];
    return decimalPart === '5';
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (isOverUnder) {
      if (!line) {
        newErrors.line = 'Line is required';
      } else if (!validateLine(line)) {
        newErrors.line = 'Line must end in 0.5 (e.g., 75.5)';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext({
      title: title.trim(),
      description: description.trim() || undefined,
      line: isOverUnder ? parseFloat(line) : undefined
    });
  };

  const getBetTypeLabel = () => {
    switch (betType) {
      case 'YES_NO': return 'Yes/No';
      case 'OVER_UNDER': return 'Over/Under';
      case 'CLOSEST_GUESS': return 'Closest Guess';
      default: return '';
    }
  };

  return (
    <div className="space-y-5">
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

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-montserrat font-bold text-white">
          Bet Details
        </h2>
        <span
          className="text-xs font-montserrat font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: `${themeColor}20`,
            color: themeColor
          }}
        >
          {getBetTypeLabel()}
        </span>
      </div>

      {/* Title Field */}
      <div>
        <label className="block text-sm font-montserrat font-semibold text-white mb-2">
          Title *
        </label>
        <input
          type="text"
          placeholder="Brownies to Lose?"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) {
              setErrors(prev => ({ ...prev, title: '' }));
            }
          }}
          className={`
            w-full p-3 rounded-lg bg-[#18181B]
            text-white font-montserrat text-sm
            border-2 focus:outline-none
            ${errors.title
              ? 'border-red-500'
              : 'border-zinc-800 focus:border-[#FF6B35]'
            }
          `}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1 font-montserrat">
            {errors.title}
          </p>
        )}
      </div>

      {/* Description Field (Optional) */}
      <div>
        <label className="block text-sm font-montserrat font-semibold text-white mb-2">
          Description
        </label>
        <textarea
          placeholder="(Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="
            w-full p-3 rounded-lg bg-[#18181B]
            text-white font-montserrat text-sm
            border-2 border-zinc-800 focus:border-[#FF6B35]
            focus:outline-none resize-none
          "
        />
      </div>

      {/* Line Field (Over/Under Only) */}
      {isOverUnder && (
        <div>
          <label className="block text-sm font-montserrat font-semibold text-white mb-2">
            Line *
          </label>
          <input
            type="text"
            placeholder="Must End in 0.5"
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              if (errors.line) {
                setErrors(prev => ({ ...prev, line: '' }));
              }
            }}
            className={`
              w-full p-3 rounded-lg bg-[#18181B]
              text-white font-montserrat text-sm
              border-2 focus:outline-none
              ${errors.line
                ? 'border-red-500'
                : 'border-zinc-800 focus:border-[#FF6B35]'
              }
            `}
          />
          {errors.line && (
            <p className="text-red-500 text-xs mt-1 font-montserrat">
              {errors.line}
            </p>
          )}
        </div>
      )}

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
          onClick={handleNext}
          className="
            flex-1 bg-[#8B4513] text-white py-3 rounded-lg
            font-montserrat font-semibold
            hover:bg-[#9B5523] transition-colors
          "
        >
          Next
        </button>
      </div>
    </div>
  );
}
