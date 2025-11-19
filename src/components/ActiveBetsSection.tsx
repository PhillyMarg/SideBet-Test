"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type FilterOption = "ALL" | "OPEN" | "MY PICKS" | "PENDING" | "SOON" | "H2H";

interface ActiveBetsSectionProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ActiveBetsSection({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ActiveBetsSectionProps) {
  const filters: FilterOption[] = ["ALL", "OPEN", "MY PICKS", "PENDING", "SOON", "H2H"];

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px 0",
        width: "100%",
        maxWidth: "393px",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Title: ACTIVE BETS */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10px 148px",
          backgroundColor: "#18181B",
        }}
      >
        <h2
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: "700",
            fontSize: "14px",
            color: "#FFFFFF",
            letterSpacing: "2.1px",
            textAlign: "center",
            margin: "0",
            whiteSpace: "nowrap",
          }}
        >
          ACTIVE BETS
        </h2>
      </div>

      {/* Filter Pills Container */}
      <div
        style={{
          display: "flex",
          padding: "0 24px",
          backgroundColor: "#18181B",
          overflow: "hidden",
        }}
      >
        <div
          className="pills-scroll"
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            overflowY: "hidden",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {filters.map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "3px 12px",
                  background: "transparent",
                  border: isSelected ? "1px solid #FF6B35" : "1px solid #3F3F46",
                  borderRadius: "8px",
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: isSelected ? "700" : "600",
                  fontSize: "12px",
                  color: isSelected ? "#FF6B35" : "#FFFFFF",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#52525B";
                    e.currentTarget.style.opacity = "0.9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#3F3F46";
                    e.currentTarget.style.opacity = "1";
                  }
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          padding: "8px 24px",
          backgroundColor: "#18181B",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            backgroundColor: "#1E1E1E",
            borderRadius: "6px",
            width: "100%",
            height: "40px",
          }}
        >
          <Search
            size={16}
            style={{
              color: "#FF6B35",
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            placeholder="Search Bets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: "600",
              fontSize: "12px",
              color: "#FFFFFF",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
            }}
            className="search-input-placeholder"
          />
        </div>
      </div>

      <style jsx>{`
        .pills-scroll::-webkit-scrollbar {
          display: none;
        }

        .search-input-placeholder::placeholder {
          color: #B3B3B3;
        }
      `}</style>
    </section>
  );
}
