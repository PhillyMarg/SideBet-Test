import { FilterTab, SortOption } from "../components/BetFilters";

/**
 * Filter bets based on the selected tab
 */
export function filterBets(
  bets: any[],
  activeTab: FilterTab,
  userId: string
): any[] {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  switch (activeTab) {
    case "open":
      return bets.filter(
        (bet) =>
          bet.status === "OPEN" &&
          !bet.participants?.includes(userId)
      );

    case "myPicks":
      return bets.filter((bet) => bet.participants?.includes(userId));

    case "closingSoon":
      return bets.filter((bet) => {
        if (bet.status !== "OPEN") return false;
        const timeUntilClose = new Date(bet.closingAt).getTime() - now;
        return timeUntilClose > 0 && timeUntilClose <= twentyFourHours;
      });

    case "all":
    default:
      return bets;
  }
}

/**
 * Sort bets based on the selected sort option
 */
export function sortBets(
  bets: any[],
  sortBy: SortOption,
  groups: any[] = []
): any[] {
  const sortedBets = [...bets];

  switch (sortBy) {
    case "closingSoon":
      return sortedBets.sort(
        (a, b) =>
          new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime()
      );

    case "recent":
      return sortedBets.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    case "group":
      return sortedBets.sort((a, b) => {
        const groupA = groups.find((g) => g.id === a.groupId);
        const groupB = groups.find((g) => g.id === b.groupId);
        const nameA = groupA?.name || "";
        const nameB = groupB?.name || "";
        return nameA.localeCompare(nameB);
      });

    case "wager":
      return sortedBets.sort((a, b) => b.perUserWager - a.perUserWager);

    default:
      return sortedBets;
  }
}

/**
 * Check if a bet is closing within 24 hours
 */
export function isClosingSoon(closingAt: string): boolean {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const timeUntilClose = new Date(closingAt).getTime() - now;
  return timeUntilClose > 0 && timeUntilClose <= twentyFourHours;
}

/**
 * Get empty state message based on active tab
 */
export function getEmptyStateMessage(activeTab: FilterTab): string {
  switch (activeTab) {
    case "open":
      return "All caught up! Check back later.";
    case "myPicks":
      return "Join a bet to get started!";
    case "closingSoon":
      return "No urgent bets right now.";
    case "all":
    default:
      return "No active bets found. Create a new one!";
  }
}

/**
 * Search/filter bets based on search query
 */
export function searchBets(bets: any[], searchQuery: string): any[] {
  if (!searchQuery.trim()) return bets;

  const query = searchQuery.toLowerCase();

  return bets.filter((bet) => {
    const title = bet.title?.toLowerCase() || "";
    const description = bet.description?.toLowerCase() || "";
    const type = bet.type?.toLowerCase().replace("_", " ") || ""; // "YES_NO" → "yes no"

    return (
      title.includes(query) ||
      description.includes(query) ||
      type.includes(query)
    );
  });
}
