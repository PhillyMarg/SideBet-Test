"use client";

import { useState, useMemo } from "react";
import SearchBar from "./SearchBar";

export type FilterTab = "all" | "open" | "myPicks" | "closingSoon";
export type SortOption = "closingSoon" | "recent" | "group" | "wager";

interface BetFiltersProps {
  bets: any[];
  userId: string;
  groups?: any[]; // Only needed if using "group" sort
  activeTab: FilterTab;
  sortBy: SortOption;
  onTabChange: (tab: FilterTab) => void;
  onSortChange: (sort: SortOption) => void;
  showGroupSort?: boolean; // If false, hide "Group" sort option
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function BetFilters({
  bets,
  userId,
  groups = [],
  activeTab,
  sortBy,
  onTabChange,
  onSortChange,
  showGroupSort = true,
  searchQuery = "",
  onSearchChange,
}: BetFiltersProps) {
  // Calculate counts for each tab
  const counts = useMemo(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return {
      all: bets.length,
      open: bets.filter(
        (bet) =>
          bet.status === "OPEN" &&
          !bet.participants?.includes(userId)
      ).length,
      myPicks: bets.filter((bet) => bet.participants?.includes(userId)).length,
      closingSoon: bets.filter((bet) => {
        if (bet.status !== "OPEN") return false;
        const timeUntilClose = new Date(bet.closingAt).getTime() - now;
        return timeUntilClose > 0 && timeUntilClose <= twentyFourHours;
      }).length,
    };
  }, [bets, userId]);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All Bets", count: counts.all },
    { id: "open", label: "Open", count: counts.open },
    { id: "myPicks", label: "My Picks", count: counts.myPicks },
    { id: "closingSoon", label: "Closing Soon", count: counts.closingSoon },
  ];

  return (
    <div className="sticky top-16 z-20 bg-black border-b border-zinc-800 pb-3">
      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-white border-orange-500"
                : "text-zinc-400 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}{" "}
            <span className="text-xs text-zinc-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search Bar and Sort - Responsive Layout */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center px-4 mt-3">
        {/* Search Bar */}
        {onSearchChange && (
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search bets..."
            />
          </div>
        )}

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 sm:w-48">
          <label htmlFor="sort-select" className="text-xs text-zinc-400 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="flex-1 text-sm bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="closingSoon">Closing Soon</option>
            <option value="recent">Recent</option>
            {showGroupSort && <option value="group">Group</option>}
            <option value="wager">Wager Amount</option>
          </select>
        </div>
      </div>
    </div>
  );
}
