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
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/40 backdrop-blur-md border-t border-zinc-800 h-[68px] z-50">
      <div className="flex flex-col pt-2 px-6 pb-4">
        {/* Icons Row */}
        <div className="flex items-center justify-between w-full mb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path || pathname?.startsWith(tab.path);

            return (
              <button
                key={tab.name}
                onClick={() => router.push(tab.path)}
                className="flex flex-col items-center gap-1 p-1"
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? 'text-white' : 'text-zinc-500'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Labels Row */}
        <div className="flex items-center justify-between w-full">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || pathname?.startsWith(tab.path);

            return (
              <div
                key={`${tab.name}-label`}
                className="flex-1 text-center"
              >
                <p className={`
                  font-montserrat font-semibold text-[8px]
                  ${isActive ? 'text-white' : 'text-zinc-500'}
                `}>
                  {tab.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
