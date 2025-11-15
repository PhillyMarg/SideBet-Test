"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase/client";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";

// Lazy load heavy wizard components
const CreateBetWizard = lazy(() => import("./CreateBetWizard"));
const CreateGroupWizard = lazy(() => import("./CreateGroupWizard"));

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [groups, setGroups] = useState<any[]>([]);

  // Modal states
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");

  // Fetch user's groups for bet creation
  useEffect(() => {
    if (!user) return;

    const fetchGroups = async () => {
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", user.uid),
        limit(50)
      );
      const snapshot = await getDocs(groupsQuery);
      const groupsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGroups(groupsData);
    };

    fetchGroups();
  }, [user]);

  // Create Bet Handler
  const handleCreateBet = async (betData: any) => {
  if (betData.type === "OVER_UNDER" && !betData.line) {
    alert("Please set a valid line ending in .5 for Over/Under bets.");
    return;
  }

  if (!user || !betData.title.trim() || !betData.groupId || !betData.wager) {
    alert("Please complete all required fields.");
    return;
  }

  const betDoc = {
    title: betData.title,
    description: betData.description || "",
    type: betData.type,
    status: "OPEN",
    line: betData.line || null,
    perUserWager: parseFloat(betData.wager),
    participants: [],
    picks: {},
    creatorId: user.uid,
    groupId: betData.groupId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closingAt: betData.closingAt, // ✅ Use the closingAt from wizard (already ISO string)
  };

  try {
    await addDoc(collection(db, "bets"), betDoc);
    setShowCreateBet(false);
  } catch (err) {
    console.error("Error creating bet:", err);
    alert("Failed to create bet. Please try again.");
  }
};

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
    } catch (err) {
      console.error("Error joining group:", err);
      alert("Failed to join group. Please try again.");
    }
  };

  // Fetch user's name from Firestore when authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user's name from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firstName = userData.firstName || "";
            const lastName = userData.lastName || "";
            setUserName(`${firstName} ${lastName}`.trim());
          }
        } catch (error) {
          console.error("Error fetching user name:", error);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-lg bg-black/90 border-b border-white/10 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-8 text-white">
          {/* Desktop: Single Row Layout */}
          <div className="hidden md:flex items-center justify-between py-3">
            {/* Logo */}
            <div
              onClick={() => router.push("/home")}
              className="text-2xl font-bold cursor-pointer select-none whitespace-nowrap"
            >
              Side Bet
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateBet(true)}
                className="px-5 py-2.5 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 whitespace-nowrap"
              >
                Create Bet
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-5 py-2.5 text-sm font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Create Group
              </button>
              <button
                onClick={() => setShowJoinGroup(true)}
                className="px-5 py-2.5 text-sm font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Join
              </button>
            </div>

            {/* User & Logout */}
            <div className="flex items-center gap-2">
              {user && userName && (
                <span className="text-sm text-gray-300 truncate max-w-[120px] lg:max-w-[160px]">
                  {userName}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-5 py-2 text-sm font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile: Two Row Layout */}
          <div className="md:hidden">
            {/* Row 1: Logo + Logout */}
            <div className="flex items-center justify-between py-2">
              <div
                onClick={() => router.push("/home")}
                className="text-lg font-bold cursor-pointer select-none whitespace-nowrap"
              >
                Side Bet
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Logout
              </button>
            </div>

            {/* Row 2: Action Buttons */}
            <div className="flex items-center justify-center gap-2 pb-2">
              <button
                onClick={() => setShowCreateBet(true)}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 whitespace-nowrap"
              >
                Create Bet
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex-1 px-3 py-2 text-xs font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Create Group
              </button>
              <button
                onClick={() => setShowJoinGroup(true)}
                className="flex-1 px-3 py-2 text-xs font-semibold border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Create Bet Wizard */}
      {showCreateBet && (
        <Suspense fallback={null}>
          <CreateBetWizard
            isOpen={showCreateBet}
            onClose={() => setShowCreateBet(false)}
            groups={groups}
            onCreateBet={handleCreateBet}
          />
        </Suspense>
      )}

      {/* Create Group Wizard */}
      {showCreateGroup && (
        <Suspense fallback={null}>
          <CreateGroupWizard
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onCreateGroup={handleCreateGroup}
          />
        </Suspense>
      )}

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
              <span className="text-orange-400 font-medium">Access Code</span> or paste
              a <span className="text-orange-400 font-medium">Join Link</span> to join a
              group.
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
    </>
  );
}