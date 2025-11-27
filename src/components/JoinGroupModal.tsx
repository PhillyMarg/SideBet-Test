'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';

interface JoinGroupModalProps {
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

export default function JoinGroupModal({ onClose, onSuccess }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Please enter a 6-character invite code');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to join a group');
      return;
    }

    setLoading(true);

    try {
      // Find group with this invite code
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('inviteCode', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();

      // Check if already a member
      if (groupData.memberIds?.includes(user.uid)) {
        setError('You are already a member of this group!');
        setLoading(false);
        return;
      }

      // Add user to group
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        memberIds: arrayUnion(user.uid),
      });

      console.log('Successfully joined group:', groupDoc.id);

      if (onSuccess) {
        onSuccess(groupDoc.id);
      }

      onClose();
    } catch (error) {
      console.error('Error joining group:', error);
      setError('Failed to join group. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 font-montserrat">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md border-2 border-zinc-800 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-full transition-colors"
          type="button"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-white mb-4">
            Join Group
          </h2>

          <p className="text-[12px] text-gray-400 mb-6">
            Enter the 6-character invite code to join a group
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invite Code Input */}
            <div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ENTER CODE"
                className="w-full h-12 px-4 bg-zinc-800 border-2 border-[#ff6b35] rounded-lg text-[16px] font-semibold text-white text-center tracking-[2px] placeholder-gray-500 focus:outline-none focus:border-[#ff8c5c] uppercase"
                maxLength={6}
                autoFocus
              />
              {error && (
                <p className="text-[10px] text-red-500 mt-2">{error}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || inviteCode.length !== 6}
              className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              {loading ? 'JOINING...' : 'JOIN GROUP'}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold rounded-md transition-colors"
            >
              CANCEL
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
