"use client";

import { useState } from "react";

type FilterOption = "All" | "Open" | "Picks" | "Pending" | "Soon" | "H2H";

interface FilterPillsProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

export default function FilterPills({ activeFilter, onFilterChange }: FilterPillsProps) {
  const filters: FilterOption[] = ["All", "Open", "Picks", "Pending", "Soon", "H2H"];

  return (
    <div
      className="flex gap-[9px]"
      style={{
        marginBottom: "16px",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            style={{
              backgroundColor: isActive ? "#FF6B35" : "#18181B",
              color: isActive ? "#1E1E1E" : "white",
              fontSize: "10px",
              fontWeight: "600",
              padding: "6px 12px",
              borderRadius: "6px",
              boxShadow: isActive
                ? "2px 2px 6px -1px #F69A79"
                : "0px 4px 4px rgba(0,0,0,0.25)",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
