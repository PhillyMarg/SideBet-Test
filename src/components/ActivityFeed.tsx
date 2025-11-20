"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase/client";

interface Activity {
  id: string;
  groupId: string;
  type: "user_joined" | "user_left" | "bet_created" | "bet_judged" | "milestone";
  userId: string;
  userName: string;
  timestamp: string;
  betId?: string;
  betTitle?: string;
  winAmount?: number;
  milestoneCount?: number;
}

interface ActivityFeedProps {
  groupId: string;
  groupName: string;
}

// Utility function to safely format currency amounts
function formatCurrency(amount: number | undefined | null): string {
  // Handle undefined, null, or NaN
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }

  // Convert to number if it's somehow a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle NaN after conversion
  if (isNaN(numAmount)) {
    return '$0.00';
  }

  // Format with 2 decimal places
  const formatted = Math.abs(numAmount).toFixed(2);

  // Return with appropriate sign
  if (numAmount > 0) {
    return `+$${formatted}`;
  } else if (numAmount < 0) {
    return `-$${formatted}`;
  } else {
    return `$${formatted}`;
  }
}

export default function ActivityFeed({ groupId, groupName }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const ACTIVITIES_PER_PAGE = 20;

  // Real-time listener for new activities
  useEffect(() => {
    if (!groupId) {
      console.error("ActivityFeed: No groupId provided");
      setError("No group ID provided");
      setLoading(false);
      return;
    }

    console.log("ActivityFeed: Starting listener for group:", groupId);

    const activitiesQuery = query(
      collection(db, "activities"),
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc"),
      limit(ACTIVITIES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        console.log(`ActivityFeed: Received ${snapshot.docs.length} activities`);

        const activitiesData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log("ActivityFeed: Activity doc:", doc.id, data);
          return {
            id: doc.id,
            ...data
          } as Activity;
        });

        // Detect new activities for fade-in animation
        const currentIds = new Set(activities.map(a => a.id));
        const newIds = new Set<string>();

        activitiesData.forEach(activity => {
          if (!currentIds.has(activity.id)) {
            newIds.add(activity.id);
          }
        });

        setNewActivityIds(newIds);

        // Clear new activity IDs after animation
        setTimeout(() => {
          setNewActivityIds(new Set());
        }, 1000);

        setActivities(activitiesData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ACTIVITIES_PER_PAGE);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("ActivityFeed: Error fetching activities:", err);
        console.error("ActivityFeed: Error code:", err.code);
        console.error("ActivityFeed: Error message:", err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log("ActivityFeed: Cleaning up listener");
      unsubscribe();
    };
  }, [groupId]);

  // Load more activities
  const loadMoreActivities = async () => {
    if (!lastVisible || !hasMore || loadingMore) return;

    setLoadingMore(true);

    try {
      const moreQuery = query(
        collection(db, "activities"),
        where("groupId", "==", groupId),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(ACTIVITIES_PER_PAGE)
      );

      const snapshot = await getDocs(moreQuery);

      const moreActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];

      setActivities(prev => [...prev, ...moreActivities]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ACTIVITIES_PER_PAGE);

    } catch (error) {
      console.error("Error loading more activities:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Format activity message with orange user names
  const getActivityMessage = (activity: Activity) => {
    switch (activity.type) {
      case "user_joined":
        return (
          <>
            <span className="text-orange-500 font-semibold">{activity.userName}</span>
            <span className="text-white"> joined {groupName || 'the group'}</span>
          </>
        );

      case "user_left":
        return (
          <>
            <span className="text-orange-500 font-semibold">{activity.userName}</span>
            <span className="text-zinc-400"> left {groupName || 'the group'}</span>
          </>
        );

      case "bet_created":
        return (
          <>
            <span className="text-orange-500 font-semibold">{activity.userName}</span>
            <span className="text-white"> created a bet</span>
            <div className="text-zinc-300 text-sm mt-1 italic">"{activity.betTitle}"</div>
          </>
        );

      case "bet_judged":
        return (
          <>
            <span className="text-orange-500 font-semibold">{activity.userName}</span>
            <span className="text-white"> won </span>
            <span className="text-green-500 font-semibold">{formatCurrency(activity.winAmount)}</span>
            <span className="text-white"> on</span>
            <div className="text-zinc-300 text-sm mt-1 italic">"{activity.betTitle}"</div>
          </>
        );

      case "milestone":
        return (
          <>
            <span className="text-white">Group reached </span>
            <span className="text-orange-500 font-semibold">{activity.milestoneCount} members</span>
            <span className="text-white"> 🎉</span>
          </>
        );

      default:
        return <span className="text-zinc-400">Unknown activity</span>;
    }
  };

  // Format time ago
  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const activityTime = new Date(timestamp).getTime();
    const diff = now - activityTime;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white mb-4">Activity Feed</h3>
        <div className="text-center py-8 text-zinc-400 text-sm">
          Loading activities...
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's an index error
    const isIndexError = error.toLowerCase().includes("index") || error.toLowerCase().includes("requires an index");

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white mb-4">Activity Feed</h3>
        <div className="text-center py-8">
          {isIndexError ? (
            <>
              <p className="text-amber-500 text-sm mb-2">⚠️ Setting up Activity Feed...</p>
              <p className="text-zinc-400 text-xs mb-4">
                A database index is being created. This usually takes 1-5 minutes.
              </p>
              <p className="text-zinc-500 text-xs">
                Refresh the page in a few minutes to see activities.
              </p>
            </>
          ) : (
            <>
              <p className="text-red-500 text-sm mb-2">Error loading activities</p>
              <p className="text-zinc-500 text-xs">{error}</p>
              <p className="text-zinc-500 text-xs mt-2">
                Check console for more details
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-bold text-white mb-4">Activity Feed</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-400 text-sm mb-2">
            No activity yet in this group
          </p>
          <p className="text-zinc-500 text-xs">
            Activity will appear when members join, create bets, or bets are judged
          </p>
        </div>
      ) : (
        <>
          {/* Chat-style activity list */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`
                  py-2 px-3 rounded-lg transition-all duration-500
                  ${newActivityIds.has(activity.id)
                    ? 'animate-fadeIn bg-orange-500/10'
                    : 'hover:bg-zinc-800/50'
                  }
                `}
              >
                {/* Message */}
                <div className="text-sm leading-relaxed mb-1">
                  {getActivityMessage(activity)}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-zinc-500">
                  {getTimeAgo(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <button
              onClick={loadMoreActivities}
              disabled={loadingMore}
              className="w-full mt-4 py-2 text-sm text-orange-500 hover:text-orange-600 disabled:text-zinc-600 transition-colors"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
