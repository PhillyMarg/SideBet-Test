"use client";

import { useState } from 'react';
import { Users, Swords } from 'lucide-react';
import type { WizardTheme, WizardData } from '../BetWizard';

interface Step1Props {
  onNext: (data: Partial<WizardData>) => void;
  initialTheme: WizardTheme;
}

export function Step1ChooseType({ onNext, initialTheme }: Step1Props) {
  const [selected, setSelected] = useState<WizardTheme>(initialTheme);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-montserrat font-bold text-white text-center">
        Who's This Bet For?
      </h2>

      {/* Post to Group Option */}
      <button
        onClick={() => setSelected('group')}
        className={`
          w-full p-4 rounded-lg border-2 text-left
          transition-all flex items-center gap-3
          ${selected === 'group'
            ? 'bg-[#FF6B35]/10 border-[#FF6B35]'
            : 'bg-transparent border-zinc-800 hover:border-zinc-700'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg
          ${selected === 'group' ? 'bg-[#FF6B35]' : 'bg-zinc-800'}
        `}>
          <Users size={20} className="text-white" />
        </div>
        <div>
          <p className={`
            font-montserrat font-semibold text-sm
            ${selected === 'group' ? 'text-[#FF6B35]' : 'text-white'}
          `}>
            Post to Group
          </p>
          <p className="text-xs text-zinc-400">
            Share with Group Members
          </p>
        </div>
      </button>

      {/* Challenge Friend Option */}
      <button
        onClick={() => setSelected('friend')}
        className={`
          w-full p-4 rounded-lg border-2 text-left
          transition-all flex items-center gap-3
          ${selected === 'friend'
            ? 'bg-purple-500/10 border-purple-500'
            : 'bg-transparent border-zinc-800 hover:border-zinc-700'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg
          ${selected === 'friend' ? 'bg-purple-500' : 'bg-zinc-800'}
        `}>
          <Swords size={20} className="text-white" />
        </div>
        <div>
          <p className={`
            font-montserrat font-semibold text-sm
            ${selected === 'friend' ? 'text-purple-500' : 'text-white'}
          `}>
            Challenge Friend
          </p>
          <p className="text-xs text-zinc-400">
            Head-to-Head with a Friend
          </p>
        </div>
      </button>

      {/* Next Button */}
      <button
        onClick={() => onNext({ theme: selected })}
        className="
          w-full bg-[#8B4513] text-white py-3 rounded-lg
          font-montserrat font-semibold
          hover:bg-[#9B5523] transition-colors
        "
      >
        Next
      </button>
    </div>
  );
}
