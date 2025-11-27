"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/client";
import { useRouter } from "next/navigation";

export default function CreateBet() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [betType, setBetType] = useState("yesno");
  const [wager, setWager] = useState(5);
  const [loading, setLoading] = useState(false);

  // Load groups for the logged-in user
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const loadGroups = async () => {
      const q = query(collection(db, "groups"), where("memberIds", "array-contains", user.email));
      const snap = await getDocs(q);
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadGroups();
  }, []);

  const handleCreateBet = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a bet.");
      return;
    }

    if (!selectedGroup || !title.trim()) {
      alert("Please select a group and add a title.");
      return;
    }

    try {
      setLoading(true);
      const closingTime = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes default
      await addDoc(collection(db, "bets"), {
        title,
        description,
        type: betType,
        groupId: selectedGroup,
        creatorId: user.email,
        perUserWager: wager,
        participants: [],
        status: "active",
        closingAt: closingTime.toISOString(),
        createdAt: new Date().toISOString(),
        closingSoonNotified: false,
      });

      alert("Bet created successfully!");
      router.push(`/groups/${selectedGroup}`);
    } catch (error) {
      console.error("Error creating bet:", error);
      alert("Failed to create bet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">Create a New Bet</h1>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Bet Title"
        className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
      />

      {/* Group Selection */}
      <select
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value)}
        className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
      >
        <option value="">Select Group</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>

      {/* Bet Type */}
      <select
        value={betType}
        onChange={(e) => setBetType(e.target.value)}
        className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
      >
        <option value="yesno">Yes / No</option>
        <option value="overunder">Over / Under</option>
        <option value="closestguess">Closest Guess</option>
      </select>

      {/* Wager */}
      <input
        type="number"
        value={wager}
        onChange={(e) => setWager(Number(e.target.value))}
        placeholder="Wager Amount ($)"
        className="w-full mb-4 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
      />

      <button
        onClick={handleCreateBet}
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Bet"}
      </button>
    </div>
  );
}
