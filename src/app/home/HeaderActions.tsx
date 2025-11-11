"use client";

import { PlusCircle, Users, LogIn } from "lucide-react";

interface HeaderActionsProps {
  onCreateBet: () => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export default function HeaderActions({
  onCreateBet,
  onCreateGroup,
  onJoinGroup,
}: HeaderActionsProps) {
  return (
    <div className="flex justify-around w-full max-w-md gap-3">
      <button
        onClick={onCreateBet}
        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-xl shadow-md transition"
      >
        Create Bet
      </button>

      <button
        onClick={onCreateGroup}
        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-xl shadow-md transition"
      >
        Create Group
      </button>

      <button
        onClick={onJoinGroup}
        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-xl shadow-md transition"
      >
        Join Group
      </button>
    </div>
  );
}
