"use client";

import { useRouter, usePathname } from "next/navigation";

export default function NavigationTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { label: "Create Group", path: "/groups?action=create" },
    { label: "Join Group", path: "/groups?action=join" },
    { label: "My Groups", path: "/groups" },
    { label: "Friends", path: "/friends" },
    { label: "Account", path: "/settings" },
  ];

  return (
    <nav
      className="fixed left-0 right-0 z-40 flex items-center justify-between"
      style={{
        top: "80px",
        backgroundColor: "#1E1E1E",
        padding: "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={() => router.push(tab.path)}
          style={{
            fontSize: "12px",
            fontWeight: "400",
            color: "#FFFFFF",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
