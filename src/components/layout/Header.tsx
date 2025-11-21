"use client";

import { useState, lazy, Suspense, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  limit,
} from "firebase/firestore";
import NotificationBell from "../NotificationBell";
import { createActivity } from "../../lib/activityHelpers";
import { notifyChallengeStatus } from "../../lib/notifications";
import { ScrollableNav } from "../ui/ScrollableNav";
import { BetWizard, WizardData } from "../wizard/BetWizard";

// Lazy load wizard components
const CreateGroupWizard = lazy(() => import("../CreateGroupWizard"));

interface HeaderProps {
  userId?: string;
}

export function Header({ userId }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  // Modal states
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [groups, setGroups] = useState<any[]>([]);

  const navItems = [
    { label: "Create Group", action: "CREATE_GROUP" },
    { label: "Join Group", action: "JOIN_GROUP" },
    { label: "My Groups", path: "/groups" },
    { label: "Past Bets", path: "/past-bets" },
    { label: "Friends", path: "/friends" },
    { label: "Account", path: "/settings" },
  ];

  // Fetch user and groups when userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: userId,
            ...userData,
          } as any);
        }

        // Fetch groups for bet creation
        const groupsQuery = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", userId),
          limit(50)
        );
        const snapshot = await getDocs(groupsQuery);
        const groupsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  // Auth listener fallback
  useEffect(() => {
    if (userId) return; // Already have userId from props

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const handleNavClick = (item: { label: string; action?: string; path?: string }) => {
    if (item.action) {
      switch (item.action) {
        case "CREATE_GROUP":
          setShowCreateGroup(true);
          break;
        case "JOIN_GROUP":
          setShowJoinGroup(true);
          break;
      }
    } else if (item.path) {
      router.push(item.path);
    }
  };

  // Create Group Handler
  const handleCreateGroup = async (groupData: any) => {
    const currentUserId = userId || user?.uid;
    if (!currentUserId) {
      alert("You must be signed in to create a group.");
      return;
    }

    const groupDoc = {
      name: groupData.name,
      tagline: groupData.tagline || "",
      admin_id: currentUserId,
      memberIds: [currentUserId],
      settings: {
        min_bet: groupData.min_bet || 0,
        max_bet: groupData.max_bet || 0,
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
      setShowCreateGroup(false);
      alert("✅ Group created successfully!");
    } catch (error: any) {
      console.error("Firestore error:", error);
      alert(`Failed to create group: ${error.message || "Unknown error"}`);
    }
  };

  // Join Group Handler
  const handleJoinGroup = async () => {
    const currentUserId = userId || user?.uid;
    if (!joinInput) {
      alert("Please enter a code or link.");
      return;
    }

    if (!currentUserId) {
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

      if (groupData.memberIds?.includes(currentUserId)) {
        alert("You're already a member of this group!");
        return;
      }

      await updateDoc(matchSnap.ref, {
        memberIds: [...(groupData.memberIds || []), currentUserId],
      });

      // Get user's display name for activity
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      const userData = userDoc.data();
      const userName = userData?.displayName ||
                      `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                      "Unknown User";

      // Create activity for user joining
      await createActivity({
        groupId: matchSnap.id,
        type: "user_joined",
        userId: currentUserId,
        userName: userName
      });

      alert(`✅ Successfully joined "${groupData.name}"`);
      setShowJoinGroup(false);
      setJoinInput("");
    } catch (err) {
      console.error("Error joining group:", err);
      alert("Failed to join group. Please try again.");
    }
  };

  // Create Bet Handler
  const handleCreateBet = async (wizardData: WizardData) => {
    const currentUserId = userId || user?.uid;
    if (!currentUserId) {
      alert("You must be signed in to create a bet.");
      return;
    }

    try {
      // Get user info for notifications
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      const userData = userDoc.data();
      const userName = userData?.displayName ||
        `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
        "Unknown User";

      if (wizardData.theme === 'group') {
        // Create group bet
        const betDoc = {
          title: wizardData.title,
          description: wizardData.description || "",
          type: wizardData.betType,
          creatorId: currentUserId,
          groupId: wizardData.targetId,
          closingAt: wizardData.closingDate?.toISOString(),
          createdAt: new Date().toISOString(),
          status: "OPEN",
          picks: {},
          participants: [],
          winners: [],
          perUserWager: wizardData.wagerAmount,
          line: wizardData.line || null,
          isH2H: false,
        };

        const docRef = await addDoc(collection(db, "bets"), betDoc);

        // Create activity for bet creation
        await createActivity({
          groupId: wizardData.targetId!,
          type: "bet_created",
          userId: currentUserId,
          userName: userName,
          betId: docRef.id,
          betTitle: wizardData.title || ""
        });

        // Get group members for notifications
        const groupDoc = await getDoc(doc(db, "groups", wizardData.targetId!));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const memberIds = groupData.memberIds || [];

          // Send notifications to all group members except creator
          for (const memberId of memberIds) {
            if (memberId !== currentUserId) {
              await addDoc(collection(db, "notifications"), {
                userId: memberId,
                type: "new_bet",
                message: `${userName} created a new bet: "${wizardData.title}"`,
                betId: docRef.id,
                groupId: wizardData.targetId,
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }

        setShowCreateBet(false);
        router.push('/home');
      } else {
        // Create H2H bet
        // Get challengee info
        const challengeeDoc = await getDoc(doc(db, "users", wizardData.targetId!));
        const challengeeData = challengeeDoc.data();
        const challengeeName = challengeeData?.displayName ||
          `${challengeeData?.firstName || ''} ${challengeeData?.lastName || ''}`.trim() ||
          "Unknown User";

        const betDoc = {
          title: wizardData.title,
          description: wizardData.description || "",
          type: wizardData.betType,
          creatorId: currentUserId,
          challengerId: currentUserId,
          challengeeId: wizardData.targetId,
          challengerName: userName,
          challengeeName: challengeeName,
          closingAt: wizardData.closingDate?.toISOString(),
          createdAt: new Date().toISOString(),
          status: "OPEN",
          h2hStatus: "pending",
          picks: {},
          participants: [currentUserId],
          winners: [],
          betAmount: wizardData.wagerAmount,
          perUserWager: wizardData.wagerAmount,
          line: wizardData.line || null,
          isH2H: true,
          h2hOdds: { challenger: 1, challengee: 1 },
          groupId: null,
        };

        const docRef = await addDoc(collection(db, "bets"), betDoc);

        // Send notification to challengee
        await addDoc(collection(db, "notifications"), {
          userId: wizardData.targetId,
          type: "h2h_challenge",
          message: `${userName} challenged you to a bet: "${wizardData.title}"`,
          betId: docRef.id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        setShowCreateBet(false);
        router.push('/home');
      }
    } catch (error: any) {
      console.error("Error creating bet:", error);
      alert(`Failed to create bet: ${error.message || "Unknown error"}`);
    }
  };

  // Handle accepting H2H challenge from notification
  const handleAcceptChallenge = async (betId: string) => {
    const currentUserId = userId || user?.uid;
    if (!currentUserId) return;

    try {
      const betRef = doc(db, "bets", betId);
      const betSnap = await getDoc(betRef);

      if (!betSnap.exists()) {
        alert("Challenge not found");
        return;
      }

      const betData = betSnap.data();

      // Update bet status to accepted
      await updateDoc(betRef, {
        h2hStatus: "accepted",
        acceptedAt: new Date().toISOString(),
        participants: [...(betData.participants || []), currentUserId],
        updatedAt: new Date().toISOString(),
      });

      // Get user's display name
      const userDocRef = await getDoc(doc(db, "users", currentUserId));
      const userData = userDocRef.exists() ? userDocRef.data() : null;
      const responderName = userData?.displayName ||
        `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
        "Your friend";

      // Notify creator that challenge was accepted
      await notifyChallengeStatus(
        betData.challengerId,
        betId,
        betData.title,
        true,
        responderName
      );

      console.log("Challenge accepted!");
    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert("Failed to accept challenge. Please try again.");
    }
  };

  // Handle declining H2H challenge from notification
  const handleDeclineChallenge = async (betId: string) => {
    const currentUserId = userId || user?.uid;
    if (!currentUserId) return;

    try {
      const confirmed = confirm("Are you sure you want to decline this challenge?");
      if (!confirmed) return;

      const betRef = doc(db, "bets", betId);
      const betSnap = await getDoc(betRef);

      if (!betSnap.exists()) {
        alert("Challenge not found");
        return;
      }

      const betData = betSnap.data();

      // Update bet status to declined
      await updateDoc(betRef, {
        h2hStatus: "declined",
        declinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Get user's display name
      const userDocRef = await getDoc(doc(db, "users", currentUserId));
      const userData = userDocRef.exists() ? userDocRef.data() : null;
      const responderName = userData?.displayName ||
        `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
        "Your friend";

      // Notify creator that challenge was declined
      await notifyChallengeStatus(
        betData.challengerId,
        betId,
        betData.title,
        false,
        responderName
      );

      console.log("Challenge declined");
    } catch (error) {
      console.error("Error declining challenge:", error);
      alert("Failed to decline challenge. Please try again.");
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "#0a0a0a",
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {/* Top Row: Logo + Create Bet + Bell */}
        <div
          className="flex items-center justify-between"
          style={{
            height: "60px",
            padding: "0 16px",
            borderBottom: "1px solid #27272A",
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => router.push("/home")}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: "#FF6B35",
                borderRadius: "4px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "800", color: "white" }}>
                S
              </span>
            </div>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "#FFFFFF",
                marginLeft: "8px",
                letterSpacing: "0.5px",
              }}
            >
              SIDEBET
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateBet(true)}
              style={{
                backgroundColor: "#FF6B35",
                color: "white",
                fontSize: "10px",
                fontWeight: "700",
                padding: "8px 16px",
                borderRadius: "6px",
                boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
                border: "none",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              CREATE BET
            </button>

            {/* Bell icon */}
            <div>
              {userId ? (
                <NotificationBell
                  userId={userId}
                  onAcceptChallenge={handleAcceptChallenge}
                  onDeclineChallenge={handleDeclineChallenge}
                />
              ) : (
                <Bell
                  size={24}
                  color="white"
                  style={{ cursor: "pointer" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Navigation with Gradient Overlay */}
        <div style={{ borderBottom: "1px solid #27272A" }}>
          <ScrollableNav className="px-4 py-2">
            <div className="flex items-center gap-2.5">
              {navItems.map((item) => {
                const isActive = item.path && pathname === item.path;

                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item)}
                    className={`
                      flex-shrink-0 px-3 py-0.5 rounded-lg
                      font-montserrat text-[12px] text-center whitespace-nowrap
                      border-2 border-transparent
                      transition-colors
                      bg-transparent cursor-pointer
                      ${isActive
                        ? 'text-[#ff6b35] font-semibold'
                        : 'text-white font-semibold hover:text-[#ff6b35]'
                      }
                    `}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </ScrollableNav>
        </div>
      </header>

      {/* Create Bet Wizard */}
      <BetWizard
        isOpen={showCreateBet}
        onClose={() => setShowCreateBet(false)}
        onComplete={handleCreateBet}
        userId={userId || user?.uid}
      />

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

export default Header;
