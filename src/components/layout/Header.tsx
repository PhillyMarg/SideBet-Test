"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import NotificationBell from "../NotificationBell";

interface HeaderProps {
  userId?: string;
}

export function Header({ userId }: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: "80px",
        backgroundColor: "#18181b",
        borderBottom: "1px solid #27272A",
        padding: "16px 24px",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => router.push("/home")}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: "24px",
            height: "24px",
            backgroundColor: "#FF6B35",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "800", color: "white" }}>
            S
          </span>
        </div>
        <span
          style={{
            fontSize: "16px",
            fontWeight: "800",
            color: "#FFFFFF",
            marginLeft: "8px",
            letterSpacing: "0.5px",
          }}
        >
          SIDEBET
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/create-bet")}
          style={{
            backgroundColor: "#FF6B35",
            color: "white",
            fontSize: "10px",
            fontWeight: "700",
            padding: "8px 16px",
            borderRadius: "6px",
            boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
            border: "none",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          CREATE BET
        </button>

        {/* Bell icon */}
        <div>
          {userId ? (
            <NotificationBell userId={userId} />
          ) : (
            <Bell
              size={24}
              color="white"
              style={{ cursor: "pointer" }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
