import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

/**
 * Optimized presence tracking hook
 * Updates user's online status efficiently by:
 * - Only updating when user is actually active
 * - Increasing update interval to 3 minutes (from 2)
 * - Tracking user activity events
 * - Setting offline status on unmount
 *
 * @param userId - The user's ID
 */
export function usePresence(userId: string | null) {
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    // Update presence immediately
    const updatePresence = async (isOnline: boolean) => {
      try {
        await updateDoc(userRef, {
          lastActive: new Date().toISOString(),
          isOnline,
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Activity tracker - updates last activity time
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Set up activity listeners
    const events = ['click', 'keypress', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Set initial online status
    updatePresence(true);

    // Periodic update - only if user was active in last 5 minutes
    intervalRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeSinceActivity < fiveMinutes) {
        // User was active recently, update as online
        await updatePresence(true);
      } else {
        // User has been idle, mark as offline
        await updatePresence(false);
      }
    }, 3 * 60 * 1000); // Update every 3 minutes (instead of 2)

    // Cleanup function
    return () => {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Remove event listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      // Set offline status
      updatePresence(false);
    };
  }, [userId]);
}
