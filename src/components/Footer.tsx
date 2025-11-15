"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, Settings } from "lucide-react";

function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY < 10) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  const isActive = (path: string) => pathname === path;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.footer
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 z-40 h-14 sm:h-16"
        >
          <nav className="flex items-center justify-around h-full w-full px-2 sm:px-4">
            {/* Home */}
            <button
              onClick={() => router.push("/home")}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 flex-1 max-w-[120px] transition-colors ${
                isActive("/home") ? "text-orange-500" : "text-gray-400 hover:text-white"
              }`}
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-[10px] sm:text-xs font-medium">Home</span>
            </button>

            {/* Groups */}
            <button
              onClick={() => router.push("/groups")}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 flex-1 max-w-[120px] transition-colors ${
                isActive("/groups") || pathname.startsWith("/groups/")
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-[10px] sm:text-xs font-medium">Groups</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push("/settings")}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 flex-1 max-w-[120px] transition-colors ${
                isActive("/settings") ? "text-orange-500" : "text-gray-400 hover:text-white"
              }`}
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-[10px] sm:text-xs font-medium">Settings</span>
            </button>
          </nav>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
export default React.memo(Footer);
