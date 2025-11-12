"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Footer from "../../components/Footer";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          setUserData(userDoc.data());
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

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-black text-white pb-20 flex flex-col items-center"
      style={{ "--content-width": "500px" } as React.CSSProperties}
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

      {/* Footer */}
      <Footer />

      {/* Floating Create Bet Button - Navigate to home */}
      <button
        onClick={() => router.push("/home")}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Create Bet"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </main>
  );
}