"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";

// Import the layout components
import { Header } from "../../components/layout/Header";

export default function EventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header userId={user?.uid} />
        <main className="pt-[120px] pb-20">
          <div className="px-4 sm:px-6">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-800 rounded w-32 mb-4"></div>
              <div className="h-4 bg-zinc-800 rounded w-64"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header userId={user?.uid} />

      <main className="pt-[120px] pb-20">
        <div className="px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-white mb-4">Events</h1>
          <p className="text-zinc-400">Tournament feature coming soon...</p>
        </div>
      </main>
    </div>
  );
}
