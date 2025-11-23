"use client";

import { useState } from "react";

interface NavigationProps {
  selected?: string;
  onSelect?: (nav: string) => void;
}

export function Navigation({ selected = "CREATE GROUP", onSelect }: NavigationProps) {
  const navItems = ["CREATE GROUP", "JOIN GROUP", "MY GROUPS", "FRIENDS", "ACCOUNT"];

  return (
    <nav
      className="fixed left-0 right-0 z-40"
      style={{
        top: "80px",
        backgroundColor: "#18181B",
        padding: "0 24px",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <div
        className="flex items-center overflow-x-auto"
        style={{
          gap: "10px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "8px 0",
        }}
      >
        {navItems.map((item) => {
          const isSelected = selected === item;
          return (
            <button
              key={item}
              onClick={() => onSelect?.(item)}
              style={{
                padding: "10px 12px",
                minHeight: "44px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #FF6B35" : "2px solid transparent",
                backgroundColor: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
              className="active:scale-95 transition-transform"
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: isSelected ? "#FF6B35" : "#FFFFFF",
                  fontFamily: "'Montserrat', sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        nav div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </nav>
  );
}

export default Navigation;
