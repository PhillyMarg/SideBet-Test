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

  const tabs: { id: FilterTab; label: string; mobileLabel: string; count: number }[] = [
    { id: "all", label: "All Bets", mobileLabel: "All", count: counts.all },
    { id: "open", label: "Open", mobileLabel: "Open", count: counts.open },
    { id: "myPicks", label: "My Picks", mobileLabel: "Picks", count: counts.myPicks },
    { id: "closingSoon", label: "Closing Soon", mobileLabel: "Soon", count: counts.closingSoon },
  ];

  return (
    <div className="sticky top-16 z-20 bg-black border-b border-zinc-800 pb-3">
      {/* Tabs - Horizontal scroll on mobile, full width on desktop */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-4">
        <div className="flex gap-1.5 sm:gap-2 pt-3 min-w-max sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 min-h-[44px] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-white border-orange-500"
                  : "text-zinc-400 border-transparent hover:text-zinc-300"
              }`}
            >
              {/* Show abbreviated text on mobile, full text on desktop */}
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {" "}
              <span className="text-xs text-zinc-400">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar and Sort - Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center px-4 mt-3">
        {/* Search Bar */}
        {onSearchChange && (
          <div className="flex-1 w-full">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search bets..."
            />
          </div>
        )}

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[160px]">
          {/* Hide label on mobile, show on desktop */}
          <label htmlFor="sort-select" className="hidden sm:inline text-xs text-zinc-400 whitespace-nowrap">
            Sort:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full sm:flex-1 text-sm bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
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
