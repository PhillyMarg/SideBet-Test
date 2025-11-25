"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import CreateGroupWizard from "../../components/CreateGroupWizard";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { Search } from "lucide-react";
import { Header } from "../../components/layout/Header";
import BottomNav from "../../components/BottomNav";
import GroupCard from "../../components/GroupCard";

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");

  // Fetch user's groups
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Real-time groups listener
  useEffect(() => {
    if (!user) return;

    const groupsQuery = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Create Group Handler
  const handleCreateGroup = async (groupData: any) => {
    if (!user) {
      alert("You must be signed in to create a group.");
      return;
    }

    const groupDoc = {
      name: groupData.name,
      tagline: groupData.tagline || "",
      admin_id: user.uid,
      memberIds: [user.uid],
      settings: {
        min_bet: groupData.min_bet,
        max_bet: groupData.max_bet,
        starting_balance: 0,
        season_enabled: groupData.season_enabled,
        season_type: groupData.season_type || "none",
        season_end_date: groupData.season_end_date || null,
        auto_renew: groupData.auto_renew,
      },
      inviteType: groupData.inviteType,
      joinLink: groupData.joinLink,
      accessCode: groupData.accessCode,
      created_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "groups"), groupDoc);
      alert("✅ Group created successfully!");
      window.location.reload();
    } catch (error: any) {
      console.error("Firestore error:", error);
      alert(`Failed to create group: ${error.message || "Unknown error"}`);
    }
  };

  // Join Group Handler
  const handleJoinGroup = async () => {
    if (!joinInput) {
      alert("Please enter a code or link.");
      return;
    }

    if (!user) {
      alert("You must be signed in to join a group.");
      return;
    }

    try {
      const input = joinInput.trim().toUpperCase();
      const groupsRef = collection(db, "groups");

      const codeQuery = query(groupsRef, where("accessCode", "==", input));
      const linkQuery = query(groupsRef, where("joinLink", "==", input));

      const [codeSnap, linkSnap] = await Promise.all([
        getDocs(codeQuery),
        getDocs(linkQuery),
      ]);

      const matchSnap = !codeSnap.empty
        ? codeSnap.docs[0]
        : !linkSnap.empty
        ? linkSnap.docs[0]
        : null;

      if (!matchSnap) {
        alert("No group found. Please check the code or link.");
        return;
      }

      const groupData = matchSnap.data();

      if (groupData.memberIds?.includes(user.uid)) {
        alert("You're already a member of this group!");
        return;
      }

      await updateDoc(matchSnap.ref, {
        memberIds: [...(groupData.memberIds || []), user.uid],
      });

      alert(`✅ Successfully joined "${groupData.name}"`);
      setShowJoinGroup(false);
      setJoinInput("");
      window.location.reload();
    } catch (err) {
      console.error("Error joining group:", err);
      alert("Failed to join group. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  // Filter groups by search query
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <Header userId={user?.uid} />

      {/* Main Content */}
      <main className="pt-14 pb-24">

        {/* CREATE GROUP + JOIN GROUP Buttons */}
        <div className="flex gap-9 px-6 py-1 mt-4">
          {/* CREATE GROUP Button */}
          <button
            onClick={() => setShowCreateGroup(true)}
            className="
              flex-1 h-9
              bg-black/25
              rounded-md
              flex items-center justify-center
              text-white text-[10px] font-semibold font-montserrat
              hover:bg-black/30
              transition-colors
            "
          >
            CREATE GROUP
          </button>

          {/* JOIN GROUP Button */}
          <button
            onClick={() => setShowJoinGroup(true)}
            className="
              flex-1 h-9
              bg-[rgba(255,107,53,0.52)]
              hover:bg-[rgba(255,107,53,0.65)]
              rounded-md
              flex items-center justify-center
              text-white text-[10px] font-semibold font-montserrat
              transition-colors
            "
          >
            JOIN GROUP
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2">
          <div className="bg-[#1e1e1e] rounded-md px-3 py-2 flex items-center gap-2 h-10">
            <Search className="w-4 h-4 text-[#ff6b35] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search Groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                flex-1 bg-transparent border-none outline-none
                text-[#b3b3b3] placeholder:text-[#b3b3b3]
                font-montserrat font-semibold text-[12px]
              "
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="px-6 flex flex-col gap-4 mt-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center text-white/50 py-12">
              <p className="font-montserrat">
                {searchQuery ? 'No groups found' : 'You haven\'t joined any groups yet'}
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))
          )}
        </div>

      </main>

      {/* Create Group Wizard */}
      <CreateGroupWizard
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div
          className="fixed inset-0 flex justify-center items-center z-[100] bg-black/60"
          onClick={() => setShowJoinGroup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Join a Group
            </h3>

            <p className="text-sm text-gray-400 mb-3 text-center">
              Enter an{" "}
              <span className="text-orange-400 font-medium">Access Code</span>{" "}
              or paste a{" "}
              <span className="text-orange-400 font-medium">Join Link</span> to
              join a group.
            </p>

            <input
              type="text"
              placeholder="Enter access code or join link"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.trim())}
              className="w-full bg-zinc-800 text-white p-3 rounded-md text-sm border border-zinc-700 mb-4 focus:outline-none focus:border-orange-500"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowJoinGroup(false)}
                className="text-gray-400 border border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinGroup}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}