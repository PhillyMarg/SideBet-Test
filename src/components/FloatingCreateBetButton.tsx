"use client";

import { useState } from "react";
import CreateBetWizard from "./CreateBetWizard";

interface FloatingCreateBetButtonProps {
  groups: any[];
  onCreateBet: (betData: any) => Promise<void>;
}

export default function FloatingCreateBetButton({
  groups,
  onCreateBet,
}: FloatingCreateBetButtonProps) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowWizard(true)}
        className="fixed bottom-[90px] sm:bottom-[80px] right-4 z-30
                   bg-orange-500 hover:bg-orange-600 text-white 
                   px-6 py-2 rounded-full shadow-lg
                   text-sm font-semibold
                   transition-all duration-200 
                   hover:shadow-[0_0_20px_rgba(249,115,22,0.6)]
                   active:scale-95
                   flex items-center gap-2
                   min-w-[10         0px] justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Create Bet
      </button>

      {/* Wizard Modal */}
      <CreateBetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        groups={groups}
        onCreateBet={onCreateBet}
      />
    </>
  );
}