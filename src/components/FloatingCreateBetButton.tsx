"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import CreateBetWizard from "./CreateBetWizard";

interface FloatingCreateBetButtonProps {
  groups: any[];
  onCreateBet: (betData: any) => Promise<void>;
}

/**
 * Z-Index Hierarchy:
 * - FloatingCreateBetButton: z-[70] (highest)
 * - Modals: z-[60]
 * - Header/Wizards: z-50
 * - Footer: z-40
 * - Other floating: z-30
 * - Dropdowns: z-20
 * - Tooltips: z-10
 */

const FloatingCreateBetButton = React.memo(function FloatingCreateBetButton({
  groups,
  onCreateBet,
}: FloatingCreateBetButtonProps) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      {/* Floating Button - Pill Shaped */}
      <button
        onClick={() => setShowWizard(true)}
        className="fixed right-3 sm:right-6 bottom-20 sm:bottom-24 z-[70]
                   h-11 sm:h-14
                   px-4 sm:px-6
                   rounded-full
                   bg-gradient-to-r from-orange-500 to-orange-600
                   hover:from-orange-600 hover:to-orange-700
                   active:from-orange-700 active:to-orange-800
                   text-white
                   shadow-lg shadow-orange-500/30
                   hover:shadow-xl hover:shadow-orange-500/50
                   active:shadow-md
                   flex items-center justify-center
                   gap-1.5 sm:gap-2
                   text-xs sm:text-base
                   font-bold
                   whitespace-nowrap
                   transition-all duration-200 ease-in-out
                   hover:scale-[1.03] sm:hover:scale-105
                   active:scale-95
                   touch-manipulation
                   select-none
                   group"
        aria-label="Create new bet"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200 flex-shrink-0" />
        <span className="font-bold leading-none">
          <span className="inline sm:hidden">Create</span>
          <span className="hidden sm:inline">Create Bet</span>
        </span>
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
});

export default FloatingCreateBetButton;