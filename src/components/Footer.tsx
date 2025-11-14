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
          className="fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 z-40"
        >
          <div className="flex justify-evenly items-center w-full py-2 sm:py-3">
            {/* Home */}
            <button
              onClick={() => router.push("/home")}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 transition-colors ${
                isActive("/home") ? "text-orange-500" : "text-gray-400 hover:text-orange-500"
              }`}
            >
              <Home size={24} className="sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-xs sm:text-sm mt-1.5 font-medium">Home</span>
            </button>

            {/* Groups */}
            <button
              onClick={() => router.push("/groups")}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 transition-colors ${
                isActive("/groups") || pathname.startsWith("/groups/")
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-orange-500"
              }`}
            >
              <Users size={24} className="sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-xs sm:text-sm mt-1.5 font-medium">Groups</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push("/settings")}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 transition-colors ${
                isActive("/settings") ? "text-orange-500" : "text-gray-400 hover:text-orange-500"
              }`}
            >
              <Settings size={24} className="sm:w-6 sm:h-6" strokeWidth={2} />
              <span className="text-xs sm:text-sm mt-1.5 font-medium">Settings</span>
            </button>
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
export default React.memo(Footer);
