"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        // Always show at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide footer
        setIsVisible(false);
      } else {
        // Scrolling up - show footer
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
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
          className="fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 text-gray-400 text-xs flex justify-around py-3 z-40"
        >
          <button
            onClick={() => router.push("/home")}
            className={`hover:text-orange-500 transition-colors ${
              isActive("/home") ? "text-orange-500 font-medium" : ""
            }`}
          >
            Home
          </button>
          <button
            onClick={() => router.push("/groups")}
            className={`hover:text-orange-500 transition-colors ${
              isActive("/groups") ? "text-orange-500 font-medium" : ""
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => router.push("/mybets")}
            className={`hover:text-orange-500 transition-colors ${
              isActive("/mybets") ? "text-orange-500 font-medium" : ""
            }`}
          >
            My Bets
          </button>
          <button
            onClick={() => router.push("/settings")}
            className={`hover:text-orange-500 transition-colors ${
              isActive("/settings") ? "text-orange-500 font-medium" : ""
            }`}
          >
            Settings
          </button>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}