"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';
import BottomNav from '@/components/BottomNav';

export default function SettlePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-zinc-900 border-b border-zinc-800 h-14 z-50 flex items-center justify-between px-6">
        <h1 className="font-montserrat font-bold text-white text-[16px]">
          SIDEBET
        </h1>
      </header>

      {/* Content */}
      <div className="pt-20 px-6">
        <div className="text-center py-12">
          <h2 className="font-montserrat font-bold text-white text-2xl mb-4">
            Settle Page
          </h2>
          <p className="font-montserrat text-white/50">
            Coming Soon - This page will show money balances and settlement options
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
