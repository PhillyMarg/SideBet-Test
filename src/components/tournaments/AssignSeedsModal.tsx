"use client";

import { useState, useEffect } from 'react';
import { X, GripVertical, Save } from 'lucide-react';
import { Tournament, Participant } from '@/types/tournament';
import { updateAllSeeds } from '@/services/tournamentService';

interface AssignSeedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSeedsUpdated: () => void;
}

export function AssignSeedsModal({
  isOpen,
  onClose,
  tournament,
  onSeedsUpdated
}: AssignSeedsModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Sort by current seed
      const sorted = [...tournament.participants].sort((a, b) => a.seed - b.seed);
      setParticipants(sorted);
    }
  }, [isOpen, tournament.participants]);

  if (!isOpen) return null;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newParticipants = [...participants];
    const draggedItem = newParticipants[draggedIndex];

    newParticipants.splice(draggedIndex, 1);
    newParticipants.splice(index, 0, draggedItem);

    setParticipants(newParticipants);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Create seed assignments (1-indexed)
      const seedAssignments = participants.map((p, index) => ({
        userId: p.userId,
        seed: index + 1
      }));

      await updateAllSeeds(tournament.id, seedAssignments);

      onSeedsUpdated();
      onClose();

    } catch (err) {
      console.error('Error updating seeds:', err);
      setError('Failed to update seeds');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white font-montserrat">
              Assign Seeds
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Drag to reorder participants
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={participant.userId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  bg-zinc-800 rounded-lg p-3 flex items-center gap-3 cursor-move
                  transition-all duration-200
                  ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
                  hover:bg-zinc-700
                `}
              >
                <GripVertical className="text-zinc-500 flex-shrink-0" size={20} />

                <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>

                <span className="text-white font-semibold flex-1">
                  {participant.userName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff6b35] hover:bg-[#ff8555] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Seeds'}
          </button>
        </div>
      </div>
    </div>
  );
}
