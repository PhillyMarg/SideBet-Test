"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../lib/firebase/client";
import HeaderActions from "./HeaderActions";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";  // ✅ All Firestore imports are here
import { signOut } from "firebase/auth";


function getActiveBetCount(bets: any[], groupId: string, getTimeRemaining: any) {
  return bets.filter(
    (b) => b.groupId === groupId && !getTimeRemaining(b.closingAt).isClosed
  ).length;
}

export default function HomePage() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllBets, setShowAllBets] = useState(false);
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [joinInput, setJoinInput] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error: any) {
      console.error("❌ Logout error:", error);
      alert(`Failed to logout: ${error.message || error}`);
    }
  };

  // --- Create Group State and Helpers ---
  const [showConfirm, setShowConfirm] = useState(false);

  const calcEndDate = (type: string) => {
    const now = new Date();
    const ms = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 31 * 24 * 60 * 60 * 1000,
    }[type];
    return ms ? new Date(now.getTime() + ms).toISOString().split("T")[0] : "";
  };

  const [newGroup, setNewGroup] = useState({
    name: "",
    tagline: "",
    min_bet: "",
    max_bet: "",
    season_enabled: false,
    season_type: "",
    season_end_date: "",
    auto_renew: false,
    inviteType: "link",
    joinLink: "",
    accessCode: "",
  });

  useEffect(() => {
    if (showCreateGroup) {
      setNewGroup((prev) => ({
        ...prev,
        joinLink:
          prev.joinLink ||
          `https://sidebet.app/join/${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`,
        accessCode:
          prev.accessCode ||
          Math.random().toString(36).substring(2, 7).toUpperCase(),
      }));
    }
  }, [showCreateGroup]);

  const generateCode = () =>
    Math.random().toString(36).substring(2, 7).toUpperCase();

  const [newBet, setNewBet] = useState<any>({
    type: "YES_NO",
    title: "",
    description: "",
    groupId: "",
    wager: "",
    closingAt: "",
    line: "",
  });

  // 🔁 Countdown force re-render
  useEffect(() => {
    const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 👤 Auth + Firestore (fixed real-time listener)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      const uid = firebaseUser.uid;

      // ✅ Real-time listener for groups
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", uid)
      );
      const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
        const groupsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
      });

      // ✅ Real-time listener for bets created OR joined
      const betsCreatedQuery = query(
        collection(db, "bets"),
        where("creatorId", "==", uid)
      );
      const betsJoinedQuery = query(
        collection(db, "bets"),
        where("participants", "array-contains", uid)
      );

      const unsubCreated = onSnapshot(betsCreatedQuery, (snapshot) => {
        const created = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          return [
            ...prev.filter((b) => !created.some((c) => c.id === b.id)),
            ...created,
          ];
        });
      });

      const unsubJoined = onSnapshot(betsJoinedQuery, (snapshot) => {
        const joined = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBets((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          return [
            ...prev.filter((b) => !joined.some((j) => j.id === b.id)),
            ...joined,
          ];
        });
      });

      // ✅ Cleanup all listeners
      return () => {
        unsubGroups();
        unsubCreated();
        unsubJoined();
      };
    });

    return () => unsubAuth();
  }, []);

  // 🔁 Real-time active bet count per group
  useEffect(() => {
    if (!bets.length || !groups.length) return;

    // Update counts without recreating arrays
    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        activeCount: getActiveBetCount(bets, g.id, getTimeRemaining),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bets]);

  // ⚙️ Create Bet logic
  const wagerOptions = [1, 5, 10, 20, "Custom"];
  const closingOptions = [
    { label: "1 Min", value: "1m" },
    { label: "5 Min", value: "5m" },
    { label: "30 Min", value: "30m" },
    { label: "1 Hour", value: "1h" },
    { label: "Custom", value: "custom" },
  ];

  const handleCreateBet = async () => {
    if (newBet.type === "OVER_UNDER" && !newBet.line) {
      alert("Please set a valid line ending in .5 for Over/Under bets.");
      return;
    }

    if (!user || !newBet.title.trim() || !newBet.groupId || !newBet.wager)
      return alert("Please complete all required fields.");

    const uid = user.uid;
    const now = new Date();
    const closingAt =
      newBet.closingAt === "1m"
        ? new Date(now.getTime() + 60 * 1000)
        : newBet.closingAt === "5m"
        ? new Date(now.getTime() + 5 * 60 * 1000)
        : newBet.closingAt === "30m"
        ? new Date(now.getTime() + 30 * 60 * 1000)
        : newBet.closingAt === "1h"
        ? new Date(now.getTime() + 60 * 60 * 1000)
        : new Date(now.getTime() + 10 * 60 * 1000);

    const betDoc = {
      title: newBet.title,
      description: newBet.description || "",
      type: newBet.type,
      status: "OPEN",
      line: newBet.line || null,
      perUserWager: parseFloat(newBet.wager),
      participants: [],
      picks: {},
      creatorId: uid,
      groupId: newBet.groupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closingAt: closingAt.toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "bets"), betDoc);
      setShowCreateBet(false);
      setNewBet({
        type: "YES_NO",
        title: "",
        description: "",
        groupId: "",
        wager: "",
        closingAt: "",
        line: "",
      });
    } catch (err) {
      console.error("Error creating bet:", err);
      alert("Failed to create bet. Check console for details.");
    }
  };

  // --- Update user pick in Firestore so bets persist ---
  const handleUserPick = async (bet: any, pick: string | number) => {
    if (!user) return;

    const uid = user.uid;

    try {
      // 🧠 Update picks & participants in Firestore
      const updatedPicks = { ...bet.picks, [uid]: pick };
      const updatedParticipants = Array.from(
        new Set([...(bet.participants || []), uid])
      );

      const betRef = doc(db, "bets", bet.id);
      await updateDoc(betRef, {
        picks: updatedPicks,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      // ✅ Update local state too
      setBets((prev) =>
        prev.map((b) =>
          b.id === bet.id
            ? {
                ...b,
                picks: updatedPicks,
                participants: updatedParticipants,
                userPick: pick,
              }
            : b
        )
      );
    } catch (err) {
      console.error("Error updating bet pick:", err);
      alert("Failed to place bet. Please try again.");
    }
  };

 const handleCreateGroup = async () => {
  console.log("🟠 handleCreateGroup triggered");

  if (!user) {
    console.error("❌ No user logged in.");
    alert("You must be signed in to create a group.");
    return;
  }

  if (!newGroup.name.trim()) {
    console.error("❌ Missing group name.");
    alert("Group name is required.");
    return;
  }

  // Build the document
  const groupDoc = {
    name: newGroup.name,
    tagline: newGroup.tagline || "",
    admin_id: user.uid,
    memberIds: [user.uid],
    settings: {
      min_bet: parseFloat(newGroup.min_bet) || 0,
      max_bet: parseFloat(newGroup.max_bet) || 0,
      starting_balance: 0,
      season_enabled: newGroup.season_enabled,
      season_type: newGroup.season_type || "none",
      season_end_date: newGroup.season_end_date || null,
      auto_renew: newGroup.auto_renew,
    },
    inviteType: newGroup.inviteType,
    joinLink: newGroup.joinLink,
    accessCode: newGroup.accessCode,
    created_at: new Date().toISOString(),
  };

  console.log("🟢 Attempting to add group to Firestore:", groupDoc);

  try {
    const ref = await addDoc(collection(db, "groups"), groupDoc);
    console.log("✅ Group successfully created with ID:", ref.id);

    setShowConfirm(false);
    setShowCreateGroup(false);
    setNewGroup({
      name: "",
      tagline: "",
      min_bet: "",
      max_bet: "",
      season_enabled: false,
      season_type: "",
      season_end_date: "",
      auto_renew: false,
      inviteType: "link",
      joinLink: "",
      accessCode: "",
    });

    alert("✅ Group created successfully!");
  } catch (error: any) {
    console.error("🔥 Full Firestore Error Object:", error);
    alert(`Failed to create group. Error: ${error.message || JSON.stringify(error)}`);
  }
};

  // 🧮 Utility functions
  const getLivePercentages = (bet: any) => {
    if (!bet.picks) return { yes: 0, no: 0 };
    const values = Object.values(bet.picks);
    const total = values.filter((v) => v !== null).length;
    if (total === 0) return { yes: 0, no: 0 };
    const yesCount = values.filter((v) => v === "YES" || v === "OVER").length;
    const noCount = total - yesCount;
    return {
      yes: Math.round((yesCount / total) * 100),
      no: Math.round((noCount / total) * 100),
    };
  };

  const getTimeRemaining = (closingAt: any) => {
    if (!closingAt) return { text: "No close time", isClosed: false };
    const parsed = new Date(closingAt).getTime();
    if (isNaN(parsed)) return { text: "No close time", isClosed: false };
    const diff = parsed - Date.now();
    if (diff <= 0) return { text: "CLOSED", isClosed: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    let text = "";
    if (days > 0) text = `${days}d ${hours}h`;
    else if (hours > 0) text = `${hours}h ${minutes}m`;
    else if (minutes > 0) text = `${minutes}m ${seconds}s`;
    else text = `${seconds}s`;

    return { text: `Closes in ${text}`, isClosed: false };
  };

  const activeBets = bets.filter(
    (bet) => !getTimeRemaining(bet.closingAt).isClosed
  );

  const getGroupName = (groupId: string) =>
    groups.find((g) => g.id === groupId)?.name || "Unknown Group";

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </main>
    );

  if (!user)
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Redirecting to login...</p>
      </main>
    );

  // ✅ Count how many active bets belong to a given group
  const getActiveBetCountForGroup = (groupId: string) => {
    return bets.filter(
      (bet) =>
        bet.groupId === groupId && !getTimeRemaining(bet.closingAt).isClosed
    ).length;
  };
return (
 <main
  className="min-h-screen bg-black text-white flex flex-col pb-20 relative overflow-y-auto"
  style={{ "--content-width": "500px" } as React.CSSProperties}
>   
   {/* Header with centered title and buttons */}
<header className="w-full border-b border-gray-800 bg-black py-6 flex flex-col items-center relative">
  {/* Logout button (top-right) */}
  <button
    onClick={handleLogout}
    className="absolute right-4 top-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all shadow-sm"
  >
    Logout
  </button>

  {/* Title */}
  <h1 className="text-lg font-bold text-white mb-4">SideBet</h1>

  {/* Button Row */}
<div className="flex justify-center items-center w-[92%] mx-auto gap-3" style={{ maxWidth: "var(--content-width)" }}>
  <button
    onClick={() => setShowCreateBet(true)}
    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-all whitespace-nowrap"
  >
    + Create Bet
  </button>

  <button
    onClick={() => setShowCreateGroup(true)}
    className="flex-1 flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 font-medium py-2.5 rounded-lg transition-all whitespace-nowrap"
  >
    + Create Group
  </button>

  <button
    onClick={() => setShowJoinGroup(true)}
    className="flex-1 flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 font-medium py-2.5 rounded-lg transition-all whitespace-nowrap"
  >
    + Join Group
  </button>
</div>

</header>

      {/* Active Bets */}
      <section className="p-4 flex flex-col items-center text-center mt-4">
        <h2 className="text-lg font-semibold mb-3 text-white">Active Bets</h2>
        {activeBets.length > 0 ? (
          <>
            <ul className="space-y-3 w-[92%] mx-auto" style={{ maxWidth: "var(--content-width)" }}>
              {(showAllBets ? activeBets : activeBets.slice(0, 5)).map((bet) => {
                const wager = bet.perUserWager ?? 0;
                const people = bet.participants?.length ?? 0;
                const pot = wager * people;
                const { yes, no } = getLivePercentages(bet);
                const { text: countdownText } = getTimeRemaining(bet.closingAt);
                const groupName = getGroupName(bet.groupId);
                const creator = bet.creatorName || bet.creatorId || "Unknown";

                return (
                  <li
  key={bet.id}
  className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex flex-col text-left shadow-md hover:border-orange-500 hover:scale-[1.02] transition-transform duration-200 text-sm sm:text-base w-full"
>
                    {/* Group + Creator + Countdown */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/groups/${bet.groupId}`)}
                          className="text-xs font-medium border border-orange-500 text-orange-400 rounded-full px-2 py-[2px] hover:bg-orange-500 hover:text-white transition"
                        >
                          {groupName}
                        </button>
                        <span className="text-xs text-gray-400">by {creator}</span>
                      </div>
                      <span className="text-xs font-bold text-orange-500">
                        {countdownText}
                      </span>
                    </div>

                    {/* Title + Description */}
                    <p className="font-semibold text-white mb-1 text-sm sm:text-base">
                      {bet.title}
                    </p>
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {bet.description || "No description provided."}
                    </p>

                    {/* Wager/People/Pot Info */}
                    <div className="flex justify-between text-sm text-gray-400 mb-4">
                      <span>Wager: ${wager.toFixed(2)}</span>
                      <span>People: {people}</span>
                      <span>Total Pot: ${pot.toFixed(2)}</span>
                    </div>

                    {/* Bet Interaction Section */}
                    {(() => {
                      const userAlreadyPicked =
                        bet.picks && bet.picks[user?.uid] !== undefined;

                      if (userAlreadyPicked) {
                        return (
                          <div className="mt-3 text-sm text-gray-300">
                            <p>
                              <span className="font-semibold text-orange-500">
                                Your Pick:
                              </span>{" "}
                              {bet.picks[user?.uid]}
                            </p>
                            <p>
                              <span className="font-semibold text-orange-500">
                                Total Pot:
                              </span>{" "}
                              $
                              {(
                                (bet.participants?.length ?? 0) *
                                (bet.perUserWager ?? 0)
                              ).toFixed(2)}
                            </p>
                          </div>
                        );
                      }

                      if (bet.type === "YES_NO" || bet.type === "OVER_UNDER") {
                        return (
                          <div className="flex gap-3 mt-auto">
                            <button
                              onClick={() =>
                                handleUserPick(
                                  bet,
                                  bet.type === "YES_NO" ? "YES" : "OVER"
                                )
                              }
                              className="flex-1 py-2 rounded-lg text-sm font-semibold flex justify-center items-center shadow transition-all bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              {bet.type === "YES_NO" ? "Yes" : "Over"}{" "}
                              <span className="ml-2 text-white/80 text-xs">
                                {yes}%
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                handleUserPick(
                                  bet,
                                  bet.type === "YES_NO" ? "NO" : "UNDER"
                                )
                              }
                              className="flex-1 py-2 rounded-lg text-sm font-semibold flex justify-center items-center shadow transition-all bg-white hover:bg-gray-200 text-black"
                            >
                              {bet.type === "YES_NO" ? "No" : "Under"}{" "}
                              <span className="ml-2 text-gray-600 text-xs">
                                {no}%
                              </span>
                            </button>
                          </div>
                        );
                      }

                      if (bet.type === "CLOSEST_GUESS") {
                        return (
                          <div className="flex items-center gap-2 mt-auto">
                            <input
                              type="number"
                              placeholder="Enter your guess..."
                              id={`guess-${bet.id}`}
                              className="flex-1 bg-zinc-800 text-white text-sm p-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500 transition"
                            />
                            <button
                              onClick={() => {
                                const value = (
                                  document.getElementById(
                                    `guess-${bet.id}`
                                  ) as HTMLInputElement
                                )?.value;
                                if (!value) return alert("Please enter a number.");
                                handleUserPick(bet, parseFloat(value));
                              }}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow transition-all"
                            >
                              Submit
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </li>
                );
              })}
            </ul>
            {activeBets.length > 5 && (
              <button
                onClick={() => setShowAllBets(!showAllBets)}
                className="mt-5 text-sm text-orange-500 hover:text-orange-400 font-medium transition"
              >
                {showAllBets ? "Show Less" : `Show All (${activeBets.length})`}
              </button>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            No active bets found. Create a new one!
          </p>
        )}
      </section>

      {/* Groups Section */}
      <section className="p-4 flex flex-col items-center text-center mt-6">
        <h2 className="text-lg font-semibold mb-3 text-white">Groups</h2>
        {groups.length > 0 ? (
          <ul className="space-y-4 w-full mx-auto" style={{ maxWidth: "var(--content-width)" }}>
            {groups.map((group) => {
              const activeCount = bets.filter(
                (bet) =>
                  bet.groupId === group.id &&
                  !getTimeRemaining(bet.closingAt).isClosed
              ).length;

              return (
                <li
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col text-left shadow-md hover:border-orange-500 hover:scale-[1.02] transition-transform duration-200 text-base cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white text-sm sm:text-base">
                      {group.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {group.memberIds?.length ?? 0} members
                    </p>
                  </div>

                  {/* Description */}
                  {group.tagline && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {group.tagline}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>
                      Wager Range:{" "}
                      {group.settings?.min_bet && group.settings?.max_bet
                        ? `$${group.settings.min_bet} – $${group.settings.max_bet}`
                        : "Not set"}
                    </span>
                    <span
                      className={`font-semibold ${
                        activeCount > 0 ? "text-orange-500" : "text-gray-500"
                      }`}
                    >
                      {activeCount > 0
                        ? `${activeCount} Active Bets`
                        : "No Active Bets"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">You haven't joined any groups yet.</p>
        )}

        {/* Create Group Button */}
        <button
          onClick={() => setShowCreateGroup(true)}
          className="mt-6 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 hover:shadow-[0_0_10px_2px_rgba(38,38,38,0.5)] transition duration-200"
        >
          Create Group
        </button>
      </section>

      {/* Create Bet Modal */}
      {showCreateBet && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 transition-opacity duration-300 ease-out"
          onClick={() => setShowCreateBet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5 transform transition-all duration-300 ease-out opacity-100 translate-y-0"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Create Bet
            </h3>

            {/* Bet Type */}
            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">
                Bet Type
              </label>
              <select
                value={newBet.type}
                onChange={(e) =>
                  setNewBet({ ...newBet, type: e.target.value, line: "" })
                }
                className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm"
              >
                <option value="YES_NO">Yes / No</option>
                <option value="OVER_UNDER">Over / Under</option>
                <option value="CLOSEST_GUESS">Closest Guess</option>
              </select>
            </div>

            {/* Line input - only for Over/Under */}
            {newBet.type === "OVER_UNDER" && (
              <div className="mb-3">
                <label className="block text-sm mb-2 text-gray-400">
                  Line (must end in .5)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 45.5"
                  value={newBet.line}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const formatted =
                      isNaN(val) || !Number.isFinite(val)
                        ? ""
                        : Math.floor(val) + 0.5;
                    setNewBet({ ...newBet, line: formatted });
                  }}
                  className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm"
                />
              </div>
            )}

            {/* Title */}
            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">Title</label>
              <input
                type="text"
                placeholder="Enter bet title"
                value={newBet.title}
                onChange={(e) =>
                  setNewBet({ ...newBet, title: e.target.value })
                }
                className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm"
              />
            </div>

            {/* Group */}
            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">Group</label>
              <select
                value={newBet.groupId}
                onChange={(e) =>
                  setNewBet({ ...newBet, groupId: e.target.value })
                }
                className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm"
              >
                <option value="">Select a group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wager */}
            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">Wager</label>
              <div className="flex gap-2 mb-2">
                {wagerOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setNewBet({
                        ...newBet,
                        wager: opt === "Custom" ? "" : opt.toString(),
                      })
                    }
                    className={`flex-1 py-2 rounded-md border text-sm ${
                      newBet.wager === opt.toString()
                        ? "bg-orange-500 text-white border-orange-500"
                        : "border-zinc-700 text-gray-300"
                    }`}
                  >
                    {opt === "Custom" ? "Custom" : `$${opt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Closing Time */}
            <div className="mb-4">
              <label className="block text-sm mb-2 text-gray-400">
                Closes in
              </label>
              <div className="flex gap-2 mb-2">
                {closingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setNewBet({
                        ...newBet,
                        closingAt: opt.value === "custom" ? "" : opt.value,
                      })
                    }
                    className={`flex-1 py-2 rounded-md border text-sm ${
                      newBet.closingAt === opt.value
                        ? "bg-orange-500 text-white border-orange-500"
                        : "border-zinc-700 text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowCreateBet(false)}
                className="text-gray-400 border border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBet}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Place Bet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 transition-opacity duration-300 ease-out"
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5 transform transition-all duration-300 ease-out"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Create Group
            </h3>

            {/* --- Group Info --- */}
            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">Group Name</label>
              <input
                type="text"
                placeholder="Enter group name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-2 text-gray-400">
                Description / Tagline
              </label>
              <textarea
                rows={2}
                placeholder="Enter a short description"
                value={newGroup.tagline}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, tagline: e.target.value })
                }
                className="w-full bg-zinc-800 text-white p-2 rounded-md text-sm resize-none"
              />
            </div>

            {/* --- Wager Range --- */}
            <div className="mb-4">
              <label className="block text-sm mb-2 text-gray-400">Wager Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={newGroup.min_bet}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, min_bet: e.target.value })
                  }
                  className="flex-1 bg-zinc-800 text-white p-2 rounded-md text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={newGroup.max_bet}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, max_bet: e.target.value })
                  }
                  className="flex-1 bg-zinc-800 text-white p-2 rounded-md text-sm"
                />
              </div>
              {parseFloat(newGroup.min_bet) >= parseFloat(newGroup.max_bet) &&
                newGroup.max_bet !== "" && (
                  <p className="text-xs text-red-500 mt-1">
                    Minimum wager must be less than maximum wager.
                  </p>
                )}
            </div>

            {/* --- Season Setup --- */}
            <div className="border-t border-zinc-800 pt-3 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
                <input
                  type="checkbox"
                  checked={newGroup.season_enabled}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, season_enabled: e.target.checked })
                  }
                  className="accent-orange-500 w-4 h-4"
                />
                Enable Season Tracking
              </label>

              {newGroup.season_enabled && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-400 mb-2">Season Duration</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {["daily", "weekly", "monthly", "custom", "never"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          setNewGroup({
                            ...newGroup,
                            season_type: opt,
                            season_end_date:
                              opt === "custom"
                                ? newGroup.season_end_date
                                : calcEndDate(opt),
                          })
                        }
                        className={`flex-1 py-2 rounded-md text-sm font-medium border ${
                          newGroup.season_type === opt
                            ? "bg-orange-500 text-white border-orange-500"
                            : "border-zinc-700 text-gray-300 hover:bg-zinc-700"
                        }`}
                      >
                        {opt === "never"
                          ? "Never End"
                          : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>

                  {newGroup.season_type === "custom" && (
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={newGroup.season_end_date}
                      onChange={(e) =>
                        setNewGroup({ ...newGroup, season_end_date: e.target.value })
                      }
                      className="w-full bg-zinc-900 text-white p-2 rounded-md text-sm mb-3"
                    />
                  )}

                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={newGroup.auto_renew}
                      onChange={(e) =>
                        setNewGroup({ ...newGroup, auto_renew: e.target.checked })
                      }
                      className="accent-orange-500 w-4 h-4"
                    />
                    Auto-Renew Season
                  </label>

                  <p className="text-xs text-gray-500 mt-2">
                    A "season" tracks activity for a set timeframe. Everything resets
                    to $0 at the end of the season, when outcomes are finalized. At
                    the start of a new season, every member begins again at $0.
                  </p>
                </div>
              )}
            </div>

            {/* --- Invite Members --- */}
            <div className="border-t border-zinc-800 pt-3 mb-4">
              <label className="block text-sm mb-3 text-gray-400">Invite Members</label>

              {/* Join Link */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex flex-col flex-1">
                  <p className="text-xs text-gray-400 mb-1">Join Link</p>
                  <div className="flex items-center h-9 bg-zinc-800 rounded-md overflow-hidden">
                    <div className="flex-1 text-white text-xs px-3 truncate">
                      {newGroup.joinLink || "Generating..."}
                    </div>
                    <button
                      onClick={() => {
                        if (newGroup.joinLink) {
                          navigator.clipboard.writeText(newGroup.joinLink);
                          alert("Join link copied!");
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 h-full"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Code */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col flex-1">
                  <p className="text-xs text-gray-400 mb-1">Access Code</p>
                  <div className="flex items-center h-9 bg-zinc-800 rounded-md overflow-hidden">
                    <div className="flex-1 text-white text-xs px-3 tracking-widest text-left">
                      {newGroup.accessCode || "Generating..."}
                    </div>
                    <button
                      onClick={() => {
                        if (newGroup.accessCode) {
                          navigator.clipboard.writeText(newGroup.accessCode);
                          alert("Access code copied!");
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 h-full"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Actions --- */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="text-gray-400 border border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Review & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 transition-opacity duration-300 ease-out"
          onClick={() => setShowJoinGroup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5 transform transition-all duration-300 ease-out"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Join a Group
            </h3>

            <p className="text-sm text-gray-400 mb-3 text-center">
              Enter an <span className="text-orange-400 font-medium">Access Code</span>{" "}
              or paste a{" "}
              <span className="text-orange-400 font-medium">Join Link</span> to join a
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
                onClick={async () => {
                  if (!joinInput) return alert("Please enter a code or link.");
                  if (!user)
                    return alert("You must be signed in to join a group.");

                  try {
                    const input = joinInput.trim().toUpperCase();
                    const groupsRef = collection(db, "groups");

                    // Search by accessCode or joinLink
                    const codeQuery = query(
                      groupsRef,
                      where("accessCode", "==", input)
                    );
                    const linkQuery = query(
                      groupsRef,
                      where("joinLink", "==", input)
                    );

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

                    const groupRef = matchSnap.ref;
                    const groupData = matchSnap.data();

                    // Prevent duplicates
                    if (groupData.memberIds?.includes(user.uid)) {
                      alert("You're already a member of this group!");
                      return;
                    }

                    await updateDoc(groupRef, {
                      memberIds: [...(groupData.memberIds || []), user.uid],
                    });

                    alert(`✅ Successfully joined "${groupData.name}"`);
                    setShowJoinGroup(false);
                    setJoinInput("");
                  } catch (err) {
                    console.error("Error joining group:", err);
                    alert("Failed to join group. Please try again.");
                  }
                }}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirmation Modal --- */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/70"
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl px-5 py-5"
          >
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Confirm Group Settings
            </h3>

            <ul className="text-sm text-gray-300 space-y-2 mb-4">
              <li>
                <span className="font-semibold text-white">Name:</span> {newGroup.name}
              </li>
              <li>
                <span className="font-semibold text-white">Description:</span>{" "}
                {newGroup.tagline || "None"}
              </li>
              <li>
                <span className="font-semibold text-white">Wager Range:</span> $
                {newGroup.min_bet} – ${newGroup.max_bet}
              </li>
              {newGroup.season_enabled && (
                <>
                  <li>
                    <span className="font-semibold text-white">Season Type:</span>{" "}
                    {newGroup.season_type}
                  </li>
                  <li>
                    <span className="font-semibold text-white">End Date:</span>{" "}
                    {newGroup.season_end_date || "N/A"}
                  </li>
                  <li>
                    <span className="font-semibold text-white">Auto-Renew:</span>{" "}
                    {newGroup.auto_renew ? "Yes" : "No"}
                  </li>
                </>
              )}
            </ul>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 border border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <footer className="fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 text-gray-400 text-xs flex justify-around py-3">
        <button className="text-orange-500 font-medium">Home</button>
        <button>My Bets</button>
        <button>Groups</button>
        <button>Settings</button>
      </footer>
    </main>
  );
}
