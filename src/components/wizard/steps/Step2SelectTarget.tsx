"use client";

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { db } from '../../../lib/firebase/client';
import { collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import type { WizardTheme, WizardData } from '../BetWizard';

interface Step2Props {
  theme: WizardTheme;
  onNext: (data: Partial<WizardData>) => void;
  onBack: () => void;
  userId?: string;
}

interface SelectOption {
  id: string;
  name: string;
}

export function Step2SelectTarget({ theme, onNext, onBack, userId }: Step2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const themeColor = theme === 'group' ? '#FF6B35' : '#A855F7';
  const label = theme === 'group' ? 'Choose a Group' : 'Choose a Friend';

  // Fetch groups or friends
  useEffect(() => {
    const fetchOptions = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        if (theme === 'group') {
          // Fetch user's groups
          const groupsQuery = query(
            collection(db, 'groups'),
            where('memberIds', 'array-contains', userId),
            limit(50)
          );
          const snapshot = await getDocs(groupsQuery);
          const groupsData = snapshot.docs.map(d => ({
            id: d.id,
            name: d.data().name || 'Unnamed Group'
          }));
          setOptions(groupsData);
        } else {
          // Fetch user's friends
          const friendshipsQuery = query(
            collection(db, 'friendships'),
            where('status', '==', 'accepted')
          );
          const snapshot = await getDocs(friendshipsQuery);

          const friendIds: string[] = [];
          snapshot.docs.forEach(d => {
            const data = d.data();
            if (data.requesterId === userId) {
              friendIds.push(data.addresseeId);
            } else if (data.addresseeId === userId) {
              friendIds.push(data.requesterId);
            }
          });

          // Fetch friend names
          const friendsData: SelectOption[] = [];
          for (const friendId of friendIds) {
            const userDoc = await getDoc(doc(db, 'users', friendId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const name = userData.displayName ||
                `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                'Unknown User';
              friendsData.push({ id: friendId, name });
            }
          }
          setOptions(friendsData);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [theme, userId]);

  const selectedOption = options.find(o => o.id === selected);

  const handleSelect = (id: string) => {
    setSelected(id);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-montserrat font-bold text-white text-center">
        Who's This Bet For?
      </h2>

      {/* Post to Group / Challenge Friend indicator */}
      <div className="flex justify-center">
        <span
          className="text-sm font-montserrat font-semibold px-3 py-1 rounded-full"
          style={{
            backgroundColor: `${themeColor}20`,
            color: themeColor
          }}
        >
          {theme === 'group' ? 'Post to Group' : 'Challenge Friend'}
        </span>
      </div>

      {/* Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="
            w-full p-3 rounded-lg border-2 border-zinc-800
            bg-[#18181B] text-white text-left
            flex items-center justify-between
            font-montserrat
            hover:border-zinc-700
            disabled:opacity-50
          "
        >
          <span className={selectedOption ? 'text-white' : 'text-zinc-500'}>
            {loading ? 'Loading...' : (selectedOption?.name || label)}
          </span>
          <ChevronDown
            size={20}
            className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && options.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className="
                  w-full p-3 text-left
                  hover:bg-zinc-800 transition-colors
                  font-montserrat text-sm
                "
                style={{
                  color: selected === option.id ? themeColor : 'white'
                }}
              >
                {option.name}
              </button>
            ))}
          </div>
        )}

        {isOpen && options.length === 0 && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center text-zinc-400 text-sm">
            {theme === 'group' ? 'No groups found' : 'No friends found'}
          </div>
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
          onClick={() => {
            const opt = options.find(o => o.id === selected);
            if (opt) {
              onNext({
                targetId: opt.id,
                targetName: opt.name
              });
            }
          }}
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
