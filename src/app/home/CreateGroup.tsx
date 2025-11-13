"use client";

import { useState } from "react";

export default function CreateGroup({ onClose }: { onClose: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [tagline, setTagline] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-orange-500 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Create a Group</h2>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full mb-3 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
        />
        <input
          type="text"
          placeholder="Tagline (optional)"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="w-full mb-4 p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700"
        />
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
