// src/lib/activityHelpers.ts

import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase/client";

export interface Activity {
  id?: string;
  groupId: string;
  type: "user_joined" | "user_left" | "bet_created" | "bet_judged" | "milestone";
  userId: string;
  userName: string;
  timestamp?: string;
  betId?: string;
  betTitle?: string;
  winAmount?: number;
  milestoneCount?: number;
}

/**
 * Create an activity entry in Firestore
 */
export const createActivity = async (activity: Omit<Activity, "id" | "timestamp">) => {
  try {
    await addDoc(collection(db, "activities"), {
      ...activity,
      timestamp: new Date().toISOString()
    });
    console.log("Activity created:", activity.type);
  } catch (error) {
    console.error("Error creating activity:", error);
  }
};
