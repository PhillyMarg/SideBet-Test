"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Trophy, DollarSign } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: 'Home', icon: Home, path: '/home' },
    { name: 'Groups', icon: Users, path: '/groups' },
    { name: 'Tourneys', icon: Trophy, path: '/events' },
    { name: 'Settle', icon: DollarSign, path: '/settle' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/40 backdrop-blur-md border-t border-zinc-800 z-50">
      <div className="flex items-center justify-around h-[68px] px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path || pathname?.startsWith(tab.path);

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-500'
                }`}
              />
              <span className={`
                font-montserrat font-semibold text-[8px]
                transition-colors
                ${isActive ? 'text-white' : 'text-zinc-500'}
              `}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
