// src/utils/userUtils.ts
"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase/client";

// Cache for user data to avoid repeated queries
const userCache = new Map<string, { displayName: string | null; firstName: string | null; lastName: string | null; email: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface UserData {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Fetches user data from Firestore with caching
 * @param userId - The user ID to fetch data for
 * @returns UserData object with displayName and email
 */
export async function fetchUserData(userId: string): Promise<UserData> {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      displayName: cached.displayName,
      firstName: cached.firstName,
      lastName: cached.lastName,
      email: cached.email
    };
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const userData = {
        displayName: data.displayName || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null,
      };

      // Cache the result
      userCache.set(userId, {
        ...userData,
        timestamp: Date.now(),
      });

      return userData;
    }

    // User not found, cache null values
    const emptyData = { displayName: null, firstName: null, lastName: null, email: null };
    userCache.set(userId, {
      ...emptyData,
      timestamp: Date.now(),
    });

    return emptyData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return { displayName: null, firstName: null, lastName: null, email: null };
  }
}

/**
 * Gets a display name for a user with fallback logic
 * Priority: displayName → firstName + lastName → email → "Unknown User"
 * @param userData - UserData object
 * @returns Display name string
 */
export function getUserDisplayName(userData: UserData): string {
  if (userData.displayName) {
    return userData.displayName;
  }
  if (userData.firstName && userData.lastName) {
    return `${userData.firstName} ${userData.lastName}`;
  }
  if (userData.firstName) {
    return userData.firstName;
  }
  if (userData.email) {
    return userData.email;
  }
  return "Unknown User";
}
