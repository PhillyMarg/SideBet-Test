"use client";

import { useRouter } from "next/navigation";

interface FeedGroupCardProps {
  group: {
    id: string;
    name: string;
    memberIds?: string[];
    settings?: {
      min_bet?: number;
      max_bet?: number;
    };
  };
  activeBets: number;
}

export default function FeedGroupCard({ group, activeBets }: FeedGroupCardProps) {
  const router = useRouter();

  const memberCount = group.memberIds?.length || 0;
  const minBet = group.settings?.min_bet || 0;
  const maxBet = group.settings?.max_bet || 0;

  return (
    <div
      onClick={() => router.push(`/groups/${group.id}`)}
      style={{
        background: "linear-gradient(180deg, #FF6B35 0%, #1E1E1E 100%)",
        border: "1px solid #18181B",
        borderRadius: "6px",
        padding: "12px",
        height: "63px",
        marginBottom: "7px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "#FFFFFF",
        }}
      >
        {group.name.toUpperCase()}
      </div>

      {/* Details Row 1 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "8px",
          fontWeight: "600",
          color: "#FFFFFF",
        }}
      >
        <span>Members: {memberCount}</span>
        <span></span>
      </div>

      {/* Details Row 2 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "8px",
          fontWeight: "600",
          color: "#FFFFFF",
        }}
      >
        <span>Wager Limit: ${minBet.toFixed(2)} - ${maxBet.toFixed(2)}</span>
        <span>Active Bets: {activeBets}</span>
      </div>
    </div>
  );
}
