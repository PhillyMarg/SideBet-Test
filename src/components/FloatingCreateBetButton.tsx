"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateBetWizard from "./CreateBetWizard";

interface FloatingCreateBetButtonProps {
  groups: any[];
  onCreateBet: (betData: any) => Promise<void>;
}

export default function FloatingCreateBetButton({
  groups,
  onCreateBet,
}: FloatingCreateBetButtonProps) {
  const [showCreateBet, setShowCreateBet] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowCreateBet(true)}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Create Bet"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      <CreateBetWizard
        isOpen={showCreateBet}
        onClose={() => setShowCreateBet(false)}
        groups={groups}
        onCreateBet={onCreateBet}
      />
    </>
  );
}