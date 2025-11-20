"use client";

import { useState } from 'react';
import { X } from 'lucide-react';

interface ChangeVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newVote: string) => void;
  betType: 'YES_NO' | 'OVER_UNDER';
  currentVote: string;
  betTitle: string;
}

export function ChangeVoteModal({
  isOpen,
  onClose,
  onConfirm,
  betType,
  currentVote,
  betTitle
}: ChangeVoteModalProps) {
  const [selectedVote, setSelectedVote] = useState('');

  if (!isOpen) return null;

  const options = betType === 'YES_NO'
    ? [{ value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }]
    : [{ value: 'OVER', label: 'OVER' }, { value: 'UNDER', label: 'UNDER' }];

  const handleConfirm = () => {
    if (!selectedVote) {
      alert('Please select a new vote');
      return;
    }
    if (selectedVote === currentVote) {
      alert("That's already your current vote");
      return;
    }
    onConfirm(selectedVote);
    setSelectedVote('');
  };

  const handleClose = () => {
    setSelectedVote('');
    onClose();
  };

  // Text shadow class
  const textShadow = "[text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="bg-[#18181B] rounded-lg w-full max-w-sm p-6 relative pointer-events-auto mx-4 border border-[#FF6B35]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h3 className={`text-lg font-bold text-white mb-2 ${textShadow}`}>
            Change Your Vote
          </h3>

          {/* Bet Title */}
          <p className={`text-sm text-zinc-400 mb-4 ${textShadow}`}>
            {betTitle}
          </p>

          {/* Current Vote */}
          <p className={`text-sm text-white mb-4 ${textShadow}`}>
            Current vote: <span className="text-[#FF6B35] font-semibold">{currentVote}</span>
          </p>

          {/* Vote Options */}
          <div className="space-y-3 mb-6">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedVote(option.value)}
                disabled={option.value === currentVote}
                className={`
                  w-full p-4 rounded-lg border-2 text-left
                  transition-all font-semibold
                  ${option.value === currentVote
                    ? 'opacity-50 cursor-not-allowed border-zinc-700 text-zinc-500'
                    : selectedVote === option.value
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35] text-[#ff6b35]'
                      : 'border-zinc-700 text-white hover:border-zinc-600'
                  }
                  ${textShadow}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!selectedVote || selectedVote === currentVote}
            className={`
              w-full bg-[#ff6b35] text-white py-3 rounded-lg
              font-semibold
              hover:bg-[#ff8555] transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${textShadow}
            `}
          >
            Confirm Change
          </button>
        </div>
      </div>
    </>
  );
}

export default ChangeVoteModal;
