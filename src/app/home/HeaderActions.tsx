"use client";

import React from "react";
import { Plus, Users, UserPlus } from "lucide-react";

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
    <header className="w-full flex flex-col items-center justify-center py-6 border-b border-gray-800 bg-black">
      {/* Title */}
      <h1 className="text-lg font-bold text-white mb-4">SideBet</h1>

      {/* Buttons Row */}
      <div className="flex flex-wrap justify-center items-center gap-3">
        <button
          onClick={onCreateBet}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full shadow-md transition-all font-medium"
        >
          <Plus size={16} /> Create Bet
        </button>

        <button
          onClick={onCreateGroup}
          className="flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 px-6 py-2 rounded-full transition-all"
        >
          <Users size={16} /> Create Group
        </button>

        <button
          onClick={onJoinGroup}
          className="flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 px-6 py-2 rounded-full transition-all"
        >
          <UserPlus size={16} /> Join Group
        </button>
      </div>
    </header>
  );
}
