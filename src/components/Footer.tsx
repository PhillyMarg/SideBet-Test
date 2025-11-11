"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, User } from "lucide-react";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: "Home", icon: <Home size={24} />, path: "/home" },
    { name: "Groups", icon: <Users size={24} />, path: "/groups" },
    { name: "Account", icon: <User size={24} />, path: "/settings" },
  ];

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-white/10 text-gray-400 z-50">
      <div className="flex justify-center items-center gap-20 md:gap-28 h-16">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.path);
          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 ${
                active ? "text-orange-500" : "text-gray-400 hover:text-orange-400"
              }`}
            >
              {tab.icon}
              <span className="mt-1">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
