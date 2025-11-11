"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/client";
import { useRouter } from "next/navigation";

export default function CreateGroup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a group.");
      return;
    }

    if (!groupName.trim()) {
      alert("Please enter a group name.");
      return;
    }

    try {
      setLoading(true);
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const docRef = await addDoc(collection(db, "groups"), {
        name: groupName,
        tagline,
        accessCode,
        admin_id: user.email,
        admin_uid: user.uid,
        memberIds: [user.email],
        createdAt: new Date(),
        settings: {
          season_enabled: true,
          season_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          auto_renew: true,
          minBet: 1,
          maxBet: 100,
          startingBalance: 100,
        },
      });

      alert("Group created successfully!");
      onClose();
      router.push(`/groups/${docRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        >
          <h1 className="text-2xl font-bold mb-4 text-center text-white">
            Create a New Group
          </h1>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group Name"
            className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
          />
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Tagline (optional)"
            className="w-full mb-4 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
          />
          <div className="flex justify-between gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
