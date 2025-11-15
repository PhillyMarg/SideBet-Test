"use client";

import { useState } from "react";
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
        className="fixed right-4 sm:right-6 bottom-20 sm:bottom-24 z-[70]
                   w-14 h-14 sm:w-16 sm:h-16
                   bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                   text-white rounded-full
                   shadow-lg shadow-orange-500/30
                   hover:shadow-xl hover:shadow-orange-500/40
                   active:shadow-md
                   flex items-center justify-center
                   transition-all duration-200 ease-in-out
                   hover:scale-105
                   active:scale-95
                   group"
        aria-label="Create new bet"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform duration-200" />
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