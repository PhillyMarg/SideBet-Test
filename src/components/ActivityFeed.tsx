"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase/client";
import { Clock, Users, TrendingUp, Trophy, Star } from "lucide-react";

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

export default function ActivityFeed({ groupId, groupName }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  const ACTIVITIES_PER_PAGE = 20;

  // Real-time listener for new activities
  useEffect(() => {
    if (!groupId) return;

    const activitiesQuery = query(
      collection(db, "activities"),
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc"),
      limit(ACTIVITIES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];

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
    });

    return () => unsubscribe();
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

  // Format activity message
  const getActivityMessage = (activity: Activity) => {
    switch (activity.type) {
      case "user_joined":
        return `${activity.userName} joined ${groupName || 'the group'}`;

      case "user_left":
        return `${activity.userName} left ${groupName || 'the group'}`;

      case "bet_created":
        return `${activity.userName} created a bet "${activity.betTitle}"`;

      case "bet_judged":
        return `${activity.userName} won $${activity.winAmount?.toFixed(2)} on "${activity.betTitle}"`;

      case "milestone":
        return `Group reached ${activity.milestoneCount} members!`;

      default:
        return "Unknown activity";
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "user_joined":
        return <Users className="w-4 h-4 text-green-500" />;
      case "user_left":
        return <Users className="w-4 h-4 text-zinc-500" />;
      case "bet_created":
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case "bet_judged":
        return <Trophy className="w-4 h-4 text-orange-500" />;
      case "milestone":
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-bold text-white mb-4">Activity Feed</h3>

      {loading ? (
        <div className="text-center py-8 text-zinc-400 text-sm">
          Loading activities...
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm">
          No activity yet. Be the first to create a bet!
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50
                  transition-all duration-500
                  ${newActivityIds.has(activity.id)
                    ? 'animate-fadeIn bg-orange-500/5 border-orange-500/20'
                    : ''
                  }
                `}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {getTimeAgo(activity.timestamp)}
                  </p>
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
