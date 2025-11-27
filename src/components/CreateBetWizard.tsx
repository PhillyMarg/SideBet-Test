'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Swords, CheckCircle, TrendingUp, ChevronDown, Calendar, Clock } from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

interface CreateBetWizardProps {
  onClose: () => void;
  user: any;
  preselectedGroupId?: string;
}

interface Group {
  id: string;
  name: string;
}

export default function CreateBetWizard({
  onClose,
  user,
  preselectedGroupId
}: CreateBetWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 & 2: Bet destination
  const [betDestination, setBetDestination] = useState<'group' | 'h2h'>('group');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(preselectedGroupId || '');

  // Step 3: Bet type
  const [betType, setBetType] = useState<'YES_NO' | 'OVER_UNDER'>('YES_NO');

  // Step 4: Bet details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [line, setLine] = useState('');

  // Step 5: Final details
  const [wagerAmount, setWagerAmount] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [closingTime, setClosingTime] = useState('20:00');

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('memberIds', 'array-contains', user.uid));
        const snapshot = await getDocs(q);

        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));

        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, [user]);

  const handleWagerSelect = (amount: string) => {
    setWagerAmount(amount);
  };

  const handleTimeShortcut = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);

    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    setClosingDate(date);
    setClosingTime(time);
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedGroup) {
      alert('Missing required information');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const closingAt = new Date(`${closingDate}T${closingTime}`);

      const betData: any = {
        type: betType,
        title: title,
        description: description || '',
        groupId: selectedGroup,
        creatorId: user.uid,
        wagerAmount: parseFloat(wagerAmount),
        closingAt: closingAt.toISOString(),
        status: 'OPEN',
        picks: {},
        participants: [],
        createdAt: serverTimestamp(),
      };

      if (betType === 'OVER_UNDER' && line) {
        betData.line = parseFloat(line);
      }

      await addDoc(collection(db, 'bets'), betData);

      console.log('Bet created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating bet:', error);
      alert('Failed to create bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = betDestination === 'group';
  const canProceedStep2 = betDestination === 'group' && selectedGroup;
  const canProceedStep3 = betType;
  const canProceedStep4 = title.trim() && (betType === 'YES_NO' || (betType === 'OVER_UNDER' && line && parseFloat(line) % 1 === 0.5));
  const canProceedStep5 = wagerAmount && closingDate && closingTime;

  return (
    // MODAL OVERLAY
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 font-montserrat"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* MODAL CONTENT */}
      <div
        className="bg-zinc-900 rounded-2xl w-full max-w-md border-2 border-zinc-800 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-full transition-colors z-10"
          type="button"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Wizard content */}
        <div className="p-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  s <= step ? 'bg-[#ff6b35]' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="text-[10px] text-white/60 font-semibold mb-4">
            Step {step} of 5
          </div>

          {/* STEP 1: Who's This Bet For? */}
          {step === 1 && (
            <div>
              <h2 className="text-[18px] font-bold text-white mb-6">
                Who's This Bet For?
              </h2>

              <div className="space-y-3 mb-6">
                {/* Post to Group */}
                <button
                  onClick={() => setBetDestination('group')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    betDestination === 'group'
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35]'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Users className={`w-6 h-6 mt-1 ${
                      betDestination === 'group' ? 'text-[#ff6b35]' : 'text-white'
                    }`} />
                    <div>
                      <div className={`text-[14px] font-semibold ${
                        betDestination === 'group' ? 'text-[#ff6b35]' : 'text-white'
                      }`}>
                        Post to Group
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Share with Group Members
                      </div>
                    </div>
                  </div>
                </button>

                {/* Challenge Friend - DISABLED FOR NOW */}
                <button
                  disabled
                  className="w-full p-4 rounded-lg border-2 bg-zinc-800/50 border-zinc-700 opacity-50 cursor-not-allowed text-left"
                >
                  <div className="flex items-start gap-3">
                    <Swords className="w-6 h-6 mt-1 text-purple-500" />
                    <div>
                      <div className="text-[14px] font-semibold text-purple-500">
                        Challenge Friend
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Head-to-Head with a Friend
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* STEP 2: Choose a Group */}
          {step === 2 && (
            <div>
              <h2 className="text-[18px] font-bold text-white mb-6">
                Who's This Bet For?
              </h2>

              <div className="space-y-3 mb-6">
                {/* Post to Group - selected */}
                <div className="w-full p-4 rounded-lg border-2 bg-[#ff6b35]/10 border-[#ff6b35]">
                  <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 mt-1 text-[#ff6b35]" />
                    <div>
                      <div className="text-[14px] font-semibold text-[#ff6b35]">
                        Post to Group
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Share with Group Members
                      </div>
                    </div>
                  </div>
                </div>

                {/* Challenge Friend - disabled */}
                <div className="w-full p-4 rounded-lg border-2 bg-zinc-800/50 border-zinc-700 opacity-50">
                  <div className="flex items-start gap-3">
                    <Swords className="w-6 h-6 mt-1 text-purple-500" />
                    <div>
                      <div className="text-[14px] font-semibold text-purple-500">
                        Challenge Friend
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Head-to-Head with a Friend
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group dropdown */}
                <div className="relative">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-zinc-800 border-2 border-[#ff6b35] rounded-lg text-[14px] text-white appearance-none focus:outline-none focus:border-[#ff8c5c]"
                  >
                    <option value="">Choose a Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="w-full h-12 bg-white hover:bg-gray-100 disabled:bg-zinc-800 disabled:text-white/50 disabled:cursor-not-allowed text-black text-[12px] font-semibold rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* STEP 3: What Type of Bet? */}
          {step === 3 && (
            <div>
              <h2 className="text-[18px] font-bold text-white mb-6">
                What Type of Bet?
              </h2>

              <div className="space-y-3 mb-6">
                {/* Yes/No */}
                <button
                  onClick={() => setBetType('YES_NO')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    betType === 'YES_NO'
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35]'
                      : 'bg-zinc-800 border-white hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 ${
                      betType === 'YES_NO' ? 'text-[#ff6b35]' : 'text-white'
                    }`} />
                    <div>
                      <div className={`text-[14px] font-semibold ${
                        betType === 'YES_NO' ? 'text-[#ff6b35]' : 'text-white'
                      }`}>
                        Yes/No
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Simple Yes or No Outcome
                      </div>
                    </div>
                  </div>
                </button>

                {/* Over/Under */}
                <button
                  onClick={() => setBetType('OVER_UNDER')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    betType === 'OVER_UNDER'
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35]'
                      : 'bg-zinc-800 border-white hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp className={`w-6 h-6 mt-1 ${
                      betType === 'OVER_UNDER' ? 'text-[#ff6b35]' : 'text-white'
                    }`} />
                    <div>
                      <div className={`text-[14px] font-semibold ${
                        betType === 'OVER_UNDER' ? 'text-[#ff6b35]' : 'text-white'
                      }`}>
                        Over/Under
                      </div>
                      <div className="text-[12px] text-white/60 mt-1">
                        Set a Line, Pick Over or Under
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canProceedStep3}
                  className="flex-1 h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-zinc-800 disabled:text-white/50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Bet Details */}
          {step === 4 && (
            <div>
              <div className="text-[12px] text-white/60 font-semibold mb-4">
                Bet Details
              </div>

              <div className="space-y-4 mb-6">
                {/* Title */}
                <div>
                  <label className="block text-[12px] text-white/70 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Describe the bet..."
                    className="w-full h-12 px-4 bg-zinc-800 border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff8c5c]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[12px] text-white/70 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="(Optional)"
                    className="w-full h-20 px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35] resize-none"
                  />
                </div>

                {/* Line (O/U only) */}
                {betType === 'OVER_UNDER' && (
                  <div>
                    <label className="block text-[12px] text-white/70 mb-2">
                      Line *
                    </label>
                    <input
                      type="text"
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      placeholder="Must end in 0.5"
                      className="w-full h-12 px-4 bg-zinc-800 border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff8c5c]"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!canProceedStep4}
                  className="flex-1 h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-zinc-800 disabled:text-white/50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Final Details */}
          {step === 5 && (
            <div>
              <div className="text-[12px] text-white/60 font-semibold mb-4">
                Final Details
              </div>

              <div className="space-y-6 mb-6">
                {/* Wager Amount */}
                <div>
                  <label className="block text-[12px] text-white/70 mb-2">
                    Wager Amount *
                  </label>
                  <input
                    type="text"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="$5.00"
                    className="w-full h-12 px-4 bg-zinc-800 border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-[#ff8c5c]"
                  />
                  <div className="flex gap-2 mt-2">
                    {['1', '5', '10', '20', '50'].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleWagerSelect(amount)}
                        className="flex-1 h-8 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[10px] font-semibold rounded transition-colors"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Closes On */}
                <div>
                  <label className="block text-[12px] text-white/70 mb-2">
                    Closes On *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={closingDate}
                        onChange={(e) => setClosingDate(e.target.value)}
                        className="w-full h-12 px-4 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-[14px] text-white focus:outline-none focus:border-[#ff6b35]"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    </div>
                    <div className="relative w-32">
                      <input
                        type="time"
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                        className="w-full h-12 px-4 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-[14px] text-white focus:outline-none focus:border-[#ff6b35]"
                      />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[
                      { label: '30 mins', minutes: 30 },
                      { label: '1 Hour', minutes: 60 },
                      { label: '6 Hours', minutes: 360 },
                      { label: '24 Hours', minutes: 1440 },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleTimeShortcut(option.minutes)}
                        className="flex-1 h-8 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[10px] font-semibold rounded transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  disabled={!canProceedStep5}
                  className="flex-1 h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-zinc-800 disabled:text-white/50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Confirm Bet Details */}
          {step === 6 && (
            <div>
              <h2 className="text-[18px] font-bold text-white mb-6">
                Confirm Bet Details
              </h2>

              <div className="bg-zinc-800/50 border-2 border-[#ff6b35] rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[12px] text-white/60">Group:</span>
                  <span className="text-[12px] text-white font-semibold">
                    {groups.find(g => g.id === selectedGroup)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-white/60">Bet Type:</span>
                  <span className="text-[12px] text-white font-semibold">
                    {betType === 'YES_NO' ? 'Yes/No' : 'Over/Under'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-white/60">Title:</span>
                  <span className="text-[12px] text-white font-semibold">
                    {title}
                  </span>
                </div>
                {description && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-white/60">Description:</span>
                    <span className="text-[12px] text-white font-semibold">
                      {description}
                    </span>
                  </div>
                )}
                {betType === 'OVER_UNDER' && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-white/60">Line:</span>
                    <span className="text-[12px] text-white font-semibold">
                      {line}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[12px] text-white/60">Wager:</span>
                  <span className="text-[12px] text-white font-semibold">
                    ${wagerAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-white/60">Bet Closes:</span>
                  <span className="text-[12px] text-white font-semibold">
                    {new Date(`${closingDate}T${closingTime}`).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={loading}
                  className="flex-1 h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-zinc-800 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Placing Bet...' : 'Place Bet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
