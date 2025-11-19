"use client";

import { ChevronDown } from "lucide-react";

interface FeedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption?: string;
  onSortChange?: (option: string) => void;
}

export default function FeedSearchBar({
  searchQuery,
  onSearchChange,
  sortOption = "Closing Soon",
  onSortChange,
}: FeedSearchBarProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        backgroundColor: "#18181B",
        borderRadius: "6px",
        padding: "8px 12px",
        minHeight: "36px",
        marginBottom: "24px",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          backgroundColor: "transparent",
          border: "none",
          outline: "none",
          color: "white",
          fontSize: "10px",
          fontWeight: "600",
          flex: 1,
          paddingRight: "12px",
        }}
        className="placeholder-white/60"
      />

      {/* Dropdown */}
      {onSortChange && (
        <div className="flex items-center gap-1">
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            style={{
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              paddingRight: "4px",
            }}
          >
            <option value="Closing Soon">Closing Soon</option>
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
          </select>
          <ChevronDown size={12} color="white" />
        </div>
      )}
    </div>
  );
}
