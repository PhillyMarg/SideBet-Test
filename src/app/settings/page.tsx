"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Header } from "../../components/layout/Header";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [venmoUsername, setVenmoUsername] = useState('');
  const [isEditingVenmo, setIsEditingVenmo] = useState(false);
  const [savingVenmo, setSavingVenmo] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setVenmoUsername(data.venmoUsername || '');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleSaveVenmo = async () => {
    if (!user) return;

    setSavingVenmo(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        venmoUsername: venmoUsername.trim() || null,
      });

      // Update local state
      setUserData({ ...userData, venmoUsername: venmoUsername.trim() || null });
      setIsEditingVenmo(false);
      alert("Venmo username updated successfully!");
    } catch (error) {
      console.error("Error updating Venmo username:", error);
      alert("Failed to update Venmo username. Please try again.");
    } finally {
      setSavingVenmo(false);
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <>
      <Header userId={user?.uid} />
      <main
        className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center"
        style={{ "--content-width": "500px", paddingTop: "100px" } as React.CSSProperties}
      >
      <div
        className="w-[92%] mx-auto py-8"
        style={{ maxWidth: "var(--content-width)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          {/* Account Info */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">
              Account Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <p className="text-white text-lg">
                  {userData?.firstName} {userData?.lastName}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400">Email</label>
                <p className="text-white text-lg">{user?.email}</p>
              </div>

              <div>
                <label className="text-sm text-gray-400">Venmo Username</label>
                {isEditingVenmo ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={venmoUsername}
                      onChange={(e) => setVenmoUsername(e.target.value)}
                      placeholder="@your-username"
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleSaveVenmo}
                      disabled={savingVenmo}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      {savingVenmo ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingVenmo(false);
                        setVenmoUsername(userData?.venmoUsername || '');
                      }}
                      className="px-4 py-2 border border-zinc-700 text-gray-300 hover:bg-zinc-800 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-white text-lg">
                      {userData?.venmoUsername || "Not set"}
                    </p>
                    <button
                      onClick={() => setIsEditingVenmo(true)}
                      className="text-sm text-orange-500 hover:text-orange-400"
                    >
                      {userData?.venmoUsername ? "Edit" : "Add"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400">Account Created</label>
                <p className="text-white text-lg">
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">Actions</h2>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all"
              >
                Logout
              </button>

              <button
                onClick={() => router.push("/home")}
                className="w-full px-6 py-3 border border-zinc-700 text-gray-300 hover:bg-zinc-800 font-semibold rounded-lg transition-all"
              >
                Back to Home
              </button>
            </div>
          </section>
        </motion.div>
      </div>

      {/* Floating Create Bet Button - Navigate to home */}
      <button
        onClick={() => router.push("/home")}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Create Bet"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
      </main>
    </>
  );
}