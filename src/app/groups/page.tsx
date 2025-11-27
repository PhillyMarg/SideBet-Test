"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Bell } from 'lucide-react';
import GroupCard from '@/components/GroupCard';
import JoinGroupModal from '@/components/JoinGroupModal';
import CreateGroupWizard from '@/components/CreateGroupWizard';
import CreateBetWizard from '@/components/CreateBetWizard';

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateBet, setShowCreateBet] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load groups
  useEffect(() => {
    if (!user) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter groups by search
  const filteredGroups = groups.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return group.name?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-white text-[18px] font-bold font-montserrat tracking-wider">
            SIDEBET
          </h1>
          <button className="text-white hover:text-[#ff6b35] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 px-6">
        {/* CREATE GROUP + JOIN GROUP Buttons */}
        <div className="flex gap-9 py-1 mb-4">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex-1 h-9 bg-black/25 hover:bg-black/30 text-white text-[10px] font-semibold font-montserrat rounded-md transition-colors"
          >
            CREATE GROUP
          </button>
          <button
            onClick={() => setShowJoinGroup(true)}
            className="flex-1 h-9 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[10px] font-semibold font-montserrat rounded-md transition-colors"
          >
            JOIN GROUP
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff6b35]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Groups..."
            className="w-full pl-10 pr-3 py-2 bg-[#1e1e1e] rounded-md text-white placeholder-[#b3b3b3] text-[12px] font-montserrat font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
          />
        </div>

        {/* Groups List or Empty State */}
        {filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/50 text-[14px] font-montserrat italic">
              No Active Groups. Create One, Chump!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredGroups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE BET Floating Button */}
      <button
        onClick={() => setShowCreateBet(true)}
        className="fixed bottom-[84px] right-6 z-40 px-6 py-2 h-9 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[10px] font-semibold font-montserrat rounded-md shadow-lg shadow-[#ff6b35]/30 transition-colors"
      >
        CREATE BET
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-zinc-800">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => router.push('/home')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Home</span>
          </button>

          <button
            onClick={() => router.push('/groups')}
            className="flex flex-col items-center justify-center gap-1 text-[#ff6b35]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Groups</span>
          </button>

          <button
            onClick={() => router.push('/friends')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Friends</span>
          </button>

          <button
            onClick={() => router.push('/settle')}
            className="flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-montserrat font-semibold">Settle</span>
          </button>
        </div>
      </nav>

      {/* Join Group Modal */}
      {showJoinGroup && (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onSuccess={(groupId) => {
            console.log('Joined group:', groupId);
            // Modal will close automatically
          }}
        />
      )}

      {/* Create Group Wizard */}
      {showCreateGroup && (
        <CreateGroupWizard
          onClose={() => setShowCreateGroup(false)}
          user={auth.currentUser}
        />
      )}

      {/* Create Bet Wizard */}
      {showCreateBet && (
        <CreateBetWizard
          onClose={() => setShowCreateBet(false)}
          user={auth.currentUser}
        />
      )}
    </div>
  );
}
