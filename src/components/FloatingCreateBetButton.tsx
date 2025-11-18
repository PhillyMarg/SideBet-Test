"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase/client";
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
      {showWizard && user && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
            onClick={() => setShowWizard(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-5 pointer-events-auto"
            >
              <CreateBetWizard
                user={user}
                onClose={() => setShowWizard(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}