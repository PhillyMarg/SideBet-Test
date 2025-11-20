"use client";

import { useRouter } from "next/navigation";

export function Navigation() {
  const router = useRouter();

  const navItems = [
    { label: "Create Group", path: "/groups?action=create" },
    { label: "Join Group", path: "/groups?action=join" },
    { label: "My Groups", path: "/groups" },
    { label: "Friends", path: "/friends" },
    { label: "Account", path: "/settings" },
  ];

  return (
    <nav
      className="fixed left-0 right-0 z-40"
      style={{
        top: "80px",
        backgroundColor: "#000000",
        padding: "16px 24px",
        borderBottom: "1px solid #27272A",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <div
        className="flex items-center justify-between overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "#FFFFFF",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </button>
        ))}
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
