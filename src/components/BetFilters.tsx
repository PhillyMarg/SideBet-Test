"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";

export type FilterTab = "all" | "open" | "myPicks" | "closingSoon" | "pending";
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
      pending: bets.filter((bet) => bet.status === "CLOSED").length,
    };
  }, [bets, userId]);

  const tabs: { id: FilterTab; label: string; mobileLabel: string; count: number }[] = [
    { id: "all", label: "All Bets", mobileLabel: "All", count: counts.all },
    { id: "open", label: "Open", mobileLabel: "Open", count: counts.open },
    { id: "myPicks", label: "My Picks", mobileLabel: "Picks", count: counts.myPicks },
    { id: "closingSoon", label: "Closing Soon", mobileLabel: "Soon", count: counts.closingSoon },
    { id: "pending", label: "Pending", mobileLabel: "Pending", count: counts.pending },
  ];

  return (
    <div className="sticky top-16 z-20 bg-black border-b border-zinc-800 py-3 space-y-3">
      {/* Row 1: Filter Tabs - Horizontally Scrollable */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-2 min-w-max pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
              }`}
            >
              {/* Show abbreviated text on mobile, full text on desktop */}
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Search + Sort */}
      <div className="flex items-center gap-2 px-4 sm:px-6">
        {/* Search Bar - 60% width */}
        {onSearchChange && (
          <div className="flex-1 max-w-[60%]">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />

              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sort Dropdown - 40% width */}
        <div className="flex-shrink-0 max-w-[40%] w-full">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
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
