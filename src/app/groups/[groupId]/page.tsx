'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search, Bell, Users, Trash2, LogOut, Copy } from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import ActiveBetCard from '@/components/ActiveBetCard';
import CreateBetWizard from '@/components/CreateBetWizard';

interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  inviteCode: string;
  minBet: number;
  maxBet: number;
  memberIds: string[];
}

interface Bet {
  id: string;
  title: string;
  type: string;
  status: string;
  closingAt: string;
  wagerAmount: number;
  picks?: Record<string, string>;
  participants?: string[];
  groupId?: string;
  betTheme?: string;
  [key: string]: any;
}

type FilterType = 'ALL' | 'OPEN' | 'MY_PICKS' | 'PENDING' | 'SOON' | 'H2H';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [group, setGroup] = useState<Group | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateBet, setShowCreateBet] = useState(false);

  const isCreator = group && currentUserId && group.creatorId === currentUserId;

  // Fetch current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch group details
  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));

        if (groupDoc.exists()) {
          const groupData = groupDoc.data();

          // Fetch creator name
          const creatorDoc = await getDoc(doc(db, 'users', groupData.creatorId));
          const creatorName = creatorDoc.exists()
            ? creatorDoc.data().displayName || creatorDoc.data().email
            : 'Unknown';

          setGroup({
            id: groupDoc.id,
            name: groupData.name,
            description: groupData.description || '',
            creatorId: groupData.creatorId,
            creatorName: creatorName,
            inviteCode: groupData.inviteCode,
            minBet: groupData.minBet,
            maxBet: groupData.maxBet,
            memberIds: groupData.memberIds || [],
          });
        }
      } catch (error) {
        console.error('Error fetching group:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  // Fetch bets
  useEffect(() => {
    if (!groupId) return;

    const fetchBets = async () => {
      try {
        const betsRef = collection(db, 'bets');
        const q = query(
          betsRef,
          where('groupId', '==', groupId),
          where('status', 'in', ['OPEN', 'PENDING'])
        );

        const snapshot = await getDocs(q);
        const betsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Bet[];

        setBets(betsData);
      } catch (error) {
        console.error('Error fetching bets:', error);
      }
    };

    fetchBets();
  }, [groupId]);

  const handleCopyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      alert('Invite code copied!');
    }
  };

  const handleCopyInviteLink = () => {
    if (group) {
      const link = `${window.location.origin}/join/${group.inviteCode}`;
      navigator.clipboard.writeText(link);
      alert('Invite link copied!');
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !isCreator) return;

    const confirmed = confirm(`Are you sure you want to delete "${group.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId));
      alert('Group deleted successfully');
      router.push('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !currentUserId) return;

    const confirmed = confirm(`Are you sure you want to leave "${group.name}"?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        memberIds: arrayRemove(currentUserId),
      });
      alert('Left group successfully');
      router.push('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  // Filter bets
  const getFilteredBets = () => {
    let filtered = bets;

    switch (selectedFilter) {
      case 'ALL':
        break;
      case 'OPEN':
        filtered = filtered.filter(bet => bet.status === 'OPEN');
        break;
      case 'MY_PICKS':
        filtered = filtered.filter(bet =>
          bet.picks && bet.picks[currentUserId]
        );
        break;
      case 'PENDING':
        filtered = filtered.filter(bet => bet.status === 'PENDING');
        break;
      case 'SOON':
        const twentyFourHours = new Date();
        twentyFourHours.setHours(twentyFourHours.getHours() + 24);
        filtered = filtered.filter(bet => {
          const closingDate = new Date(bet.closingAt);
          return closingDate <= twentyFourHours;
        });
        break;
      case 'H2H':
        filtered = filtered.filter(bet => bet.betTheme === 'friend');
        break;
    }

    if (searchTerm) {
      filtered = filtered.filter(bet =>
        bet.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredBets = getFilteredBets();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center font-montserrat">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center font-montserrat">
        <p className="text-white">Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1e1e] via-[#2a1810] to-[#ff6b35] font-montserrat">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#1e1e1e] border-b border-zinc-800 flex items-center justify-between px-6 z-50">
        <h1 className="text-[18px] font-bold text-white tracking-wider">
          SIDEBET
        </h1>
        <button onClick={() => router.push('/notifications')}>
          <Bell className="w-5 h-5 text-[#ff6b35]" />
        </button>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-32 px-6">
        {/* Group Info Card */}
        <div className="bg-zinc-900/40 border-2 border-red-500 rounded-lg p-4 mb-6 relative">
          {/* Delete/Leave Icon */}
          <button
            onClick={isCreator ? handleDeleteGroup : handleLeaveGroup}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-full transition-colors"
          >
            {isCreator ? (
              <Trash2 className="w-5 h-5 text-red-500" />
            ) : (
              <LogOut className="w-5 h-5 text-red-500" />
            )}
          </button>

          {/* Group Title */}
          <h2 className="text-[16px] font-bold text-white mb-1 pr-10">
            {group.name}
          </h2>

          {/* Group Description */}
          {group.description && (
            <p className="text-[12px] text-white/60 italic mb-2">
              {group.description}
            </p>
          )}

          {/* Creator */}
          <p className="text-[12px] text-white/60 mb-1">
            Group Creator: <span className="text-[#ff6b35] font-semibold">{group.creatorName}</span>
          </p>

          {/* Invite Code */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] text-white/60">Invite Code:</span>
            <span className="text-[12px] text-white font-semibold tracking-wider">
              {group.inviteCode}
            </span>
          </div>

          {/* Invite Link */}
          <button
            onClick={handleCopyInviteLink}
            className="text-[12px] text-white/60 hover:text-white transition-colors mb-2 flex items-center gap-1"
          >
            Invite Link: <span className="underline">Copy</span>
            <Copy className="w-3 h-3" />
          </button>

          {/* Wager Limit */}
          <p className="text-[12px] text-white mb-2">
            Wager Limit: ${group.minBet.toFixed(2)} - ${group.maxBet.toFixed(2)}
          </p>

          {/* Players Count */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-[12px] text-white font-semibold">
              {group.memberIds.length} Player{group.memberIds.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Filter Pills - Horizontal Scroll */}
        <div className="mb-4 -mx-6 px-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {(['ALL', 'OPEN', 'MY_PICKS', 'PENDING', 'SOON', 'H2H'] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                  selectedFilter === filter
                    ? 'bg-[#ff6b35] border-[#ff6b35] text-white'
                    : 'bg-transparent border-white text-white hover:border-[#ff6b35] hover:text-[#ff6b35]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff6b35]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Bets..."
            className="w-full h-10 pl-10 pr-4 bg-zinc-900/40 border border-zinc-800 rounded-md text-[12px] font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
          />
        </div>

        {/* Bets List or Empty State */}
        {filteredBets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] italic text-white/50 text-center">
              No Active Bets. Create One, Chump!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBets.map((bet) => (
              <ActiveBetCard
                key={bet.id}
                bet={bet}
                currentUserId={currentUserId}
                onVote={() => {}}
                onJudge={() => {}}
                onAcceptH2H={() => {}}
                onDeclineH2H={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fixed CREATE BET Button */}
      <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
        <button
          onClick={() => setShowCreateBet(true)}
          className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[12px] font-semibold rounded-lg transition-colors shadow-lg"
        >
          CREATE BET
        </button>
      </div>

      {/* Create Bet Wizard */}
      {showCreateBet && (
        <CreateBetWizard
          onClose={() => setShowCreateBet(false)}
          user={auth.currentUser}
          preselectedGroupId={groupId}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around z-50">
        <button
          onClick={() => router.push('/home')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 mb-1 text-white/60">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[8px] font-semibold text-white/60">HOME</span>
        </button>

        <button
          onClick={() => router.push('/groups')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 mb-1 text-[#ff6b35]">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[8px] font-semibold text-[#ff6b35]">GROUPS</span>
        </button>

        <button
          onClick={() => router.push('/friends')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 mb-1 text-white/60">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[8px] font-semibold text-white/60">FRIENDS</span>
        </button>

        <button
          onClick={() => router.push('/settle')}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 mb-1 text-white/60">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-[8px] font-semibold text-white/60">SETTLE</span>
        </button>
      </div>

      {/* CSS for hiding scrollbar */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
