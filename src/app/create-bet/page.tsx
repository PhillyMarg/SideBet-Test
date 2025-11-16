"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/client";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import CreateBetWizard from "../../components/CreateBetWizard";

// Component that uses useSearchParams - must be wrapped in Suspense
function CreateBetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Get groupId from URL search params if provided
  const preselectedGroupId = searchParams.get("groupId");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      // Load user's groups
      try {
        const groupsQuery = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", firebaseUser.uid)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupsList = groupsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroups(groupsList);
        setShowWizard(true);
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateBet = async (betData: any) => {
    if (!user) return;

    try {
      const betDoc = {
        ...betData,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        status: "OPEN",
        participants: [],
        wager: parseFloat(betData.wager),
        line: betData.line ? parseFloat(betData.line) : null,
      };

      await addDoc(collection(db, "bets"), betDoc);

      // Navigate back to the group or home
      if (betData.groupId) {
        router.push(`/groups/${betData.groupId}`);
      } else {
        router.push("/home");
      }
    } catch (error) {
      console.error("Error creating bet:", error);
      alert("Failed to create bet. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create a Bet</h1>

        {groups.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400 mb-4">
              You need to join or create a group before creating a bet.
            </p>
            <button
              onClick={() => router.push("/groups")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Go to Groups
            </button>
          </div>
        ) : (
          <CreateBetWizard
            isOpen={showWizard}
            onClose={() => router.push("/home")}
            groups={groups}
            onCreateBet={handleCreateBet}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

// Force dynamic rendering for this page since it uses useSearchParams
export const dynamic = 'force-dynamic';

// Main page component with Suspense boundary
export default function CreateBetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-white text-lg">Loading...</div>
        </div>
      }
    >
      <CreateBetContent />
    </Suspense>
  );
}
