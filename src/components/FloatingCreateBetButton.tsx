"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase/client";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { BetWizard, WizardData } from "./wizard/BetWizard";
import { createActivity } from "../lib/activityHelpers";

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
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Create Bet Handler
  const handleCreateBet = async (wizardData: WizardData) => {
    if (!user?.uid) {
      alert("You must be signed in to create a bet.");
      return;
    }

    try {
      // Get user info for notifications
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const userName = userData?.displayName ||
        `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
        "Unknown User";

      if (wizardData.theme === 'group') {
        // Create group bet
        const betDoc = {
          title: wizardData.title,
          description: wizardData.description || "",
          type: wizardData.betType,
          creatorId: user.uid,
          groupId: wizardData.targetId,
          closingAt: wizardData.closingDate?.toISOString(),
          createdAt: new Date().toISOString(),
          status: "OPEN",
          picks: {},
          participants: [],
          winners: [],
          perUserWager: wizardData.wagerAmount,
          line: wizardData.line || null,
          isH2H: false,
        };

        const docRef = await addDoc(collection(db, "bets"), betDoc);

        // Create activity for bet creation
        await createActivity({
          groupId: wizardData.targetId!,
          type: "bet_created",
          userId: user.uid,
          userName: userName,
          betId: docRef.id,
          betTitle: wizardData.title || ""
        });

        // Get group members for notifications
        const groupDoc = await getDoc(doc(db, "groups", wizardData.targetId!));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const memberIds = groupData.memberIds || [];

          // Send notifications to all group members except creator
          for (const memberId of memberIds) {
            if (memberId !== user.uid) {
              await addDoc(collection(db, "notifications"), {
                userId: memberId,
                type: "new_bet",
                message: `${userName} created a new bet: "${wizardData.title}"`,
                betId: docRef.id,
                groupId: wizardData.targetId,
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }

        setShowWizard(false);
        router.push(`/bets/${docRef.id}`);
      } else {
        // Create H2H bet
        // Get challengee info
        const challengeeDoc = await getDoc(doc(db, "users", wizardData.targetId!));
        const challengeeData = challengeeDoc.data();
        const challengeeName = challengeeData?.displayName ||
          `${challengeeData?.firstName || ''} ${challengeeData?.lastName || ''}`.trim() ||
          "Unknown User";

        const betDoc = {
          title: wizardData.title,
          description: wizardData.description || "",
          type: wizardData.betType,
          creatorId: user.uid,
          challengerId: user.uid,
          challengeeId: wizardData.targetId,
          challengerName: userName,
          challengeeName: challengeeName,
          closingAt: wizardData.closingDate?.toISOString(),
          createdAt: new Date().toISOString(),
          status: "OPEN",
          h2hStatus: "pending",
          picks: {},
          participants: [user.uid],
          winners: [],
          betAmount: wizardData.wagerAmount,
          perUserWager: wizardData.wagerAmount,
          line: wizardData.line || null,
          isH2H: true,
          h2hOdds: { challenger: 1, challengee: 1 },
          groupId: null,
        };

        const docRef = await addDoc(collection(db, "bets"), betDoc);

        // Send notification to challengee
        await addDoc(collection(db, "notifications"), {
          userId: wizardData.targetId,
          type: "h2h_challenge",
          message: `${userName} challenged you to a bet: "${wizardData.title}"`,
          betId: docRef.id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        setShowWizard(false);
        router.push(`/bets/${docRef.id}`);
      }
    } catch (error: any) {
      console.error("Error creating bet:", error);
      alert(`Failed to create bet: ${error.message || "Unknown error"}`);
    }
  };

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
      <BetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleCreateBet}
        userId={user?.uid}
      />
    </>
  );
}