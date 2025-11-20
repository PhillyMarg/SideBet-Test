"use client";

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { WizardTheme, WizardData } from '../BetWizard';

interface Step5Props {
  theme: WizardTheme;
  selectedTarget?: string;
  initialWager?: number;
  initialDate?: Date;
  onNext: (data: Partial<WizardData>) => void;
  onBack: () => void;
}

export function Step5FinalDetails({
  theme,
  selectedTarget,
  initialWager,
  initialDate,
  onNext,
  onBack
}: Step5Props) {
  const [wager, setWager] = useState(initialWager?.toString() || '');
  const [closingDate, setClosingDate] = useState(
    initialDate ? initialDate.toISOString().split('T')[0] : ''
  );
  const [closingTime, setClosingTime] = useState(
    initialDate ? initialDate.toTimeString().slice(0, 5) : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const themeColor = theme === 'group' ? '#FF6B35' : '#A855F7';

  const quickAmounts = [1, 5, 10, 20, 50];
  const quickTimes = [
    { label: '30 mins', minutes: 30 },
    { label: '1 Hour', minutes: 60 },
    { label: '6 Hours', minutes: 360 },
    { label: '24 Hours', minutes: 1440 }
  ];

  const setQuickTime = (minutes: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60000);
    setClosingDate(future.toISOString().split('T')[0]);
    setClosingTime(future.toTimeString().slice(0, 5));
    if (errors.date || errors.time) {
      setErrors(prev => ({ ...prev, date: '', time: '' }));
    }
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!wager || parseFloat(wager) <= 0) {
      newErrors.wager = 'Wager amount is required';
    }

    if (!closingDate) {
      newErrors.date = 'Closing date is required';
    }

    if (!closingTime) {
      newErrors.time = 'Closing time is required';
    }

    if (closingDate && closingTime) {
      const selectedDateTime = new Date(`${closingDate}T${closingTime}`);
      if (selectedDateTime <= new Date()) {
        newErrors.date = 'Closing time must be in the future';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const closingDateTime = new Date(`${closingDate}T${closingTime}`);

    onNext({
      wagerAmount: parseFloat(wager),
      closingDate: closingDateTime
    });
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
          Final Details
        </h2>
      </div>

      {/* Wager Amount */}
      <div>
        <label className="block text-sm font-montserrat font-semibold text-white mb-2">
          Wager Amount *
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="$5.00"
          value={wager}
          onChange={(e) => {
            setWager(e.target.value);
            if (errors.wager) {
              setErrors(prev => ({ ...prev, wager: '' }));
            }
          }}
          className={`
            w-full p-3 rounded-lg bg-[#18181B]
            text-white font-montserrat text-sm
            border-2 focus:outline-none
            ${errors.wager
              ? 'border-red-500'
              : 'border-zinc-800 focus:border-[#FF6B35]'
            }
          `}
        />
        {errors.wager && (
          <p className="text-red-500 text-xs mt-1 font-montserrat">
            {errors.wager}
          </p>
        )}

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mt-3">
          {quickAmounts.map(amount => (
            <button
              key={amount}
              onClick={() => {
                setWager(amount.toString());
                if (errors.wager) {
                  setErrors(prev => ({ ...prev, wager: '' }));
                }
              }}
              className="
                flex-1 py-2 rounded-lg
                font-montserrat font-semibold text-xs
                text-white
                transition-colors hover:opacity-90
              "
              style={{
                backgroundColor: themeColor,
                opacity: wager === amount.toString() ? 1 : 0.7
              }}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Closing Date & Time */}
      <div>
        <label className="block text-sm font-montserrat font-semibold text-white mb-2">
          Closes On *
        </label>

        {/* Quick Time Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickTimes.map(qt => (
            <button
              key={qt.label}
              onClick={() => setQuickTime(qt.minutes)}
              className="
                py-2 px-1 rounded-lg
                font-montserrat font-semibold text-xs
                text-white
                transition-colors hover:opacity-90
              "
              style={{ backgroundColor: themeColor }}
            >
              {qt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {/* Date Input */}
          <div className="flex-1">
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="date"
                value={closingDate}
                onChange={(e) => {
                  setClosingDate(e.target.value);
                  if (errors.date) {
                    setErrors(prev => ({ ...prev, date: '' }));
                  }
                }}
                className={`
                  w-full pl-10 pr-3 py-3 rounded-lg bg-[#18181B]
                  text-white font-montserrat text-sm
                  border-2 focus:outline-none
                  ${errors.date
                    ? 'border-red-500'
                    : 'border-zinc-800 focus:border-[#FF6B35]'
                  }
                `}
              />
            </div>
          </div>

          {/* Time Input */}
          <div className="flex-1">
            <div className="relative">
              <Clock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="time"
                value={closingTime}
                onChange={(e) => {
                  setClosingTime(e.target.value);
                  if (errors.time) {
                    setErrors(prev => ({ ...prev, time: '' }));
                  }
                }}
                className={`
                  w-full pl-10 pr-3 py-3 rounded-lg bg-[#18181B]
                  text-white font-montserrat text-sm
                  border-2 focus:outline-none
                  ${errors.time
                    ? 'border-red-500'
                    : 'border-zinc-800 focus:border-[#FF6B35]'
                  }
                `}
              />
            </div>
          </div>
        </div>

        {(errors.date || errors.time) && (
          <p className="text-red-500 text-xs mt-1 font-montserrat">
            {errors.date || errors.time}
          </p>
        )}
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
