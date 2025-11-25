"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import { getDoc, doc } from "firebase/firestore";
import NotificationBell from "../NotificationBell";
import { notifyChallengeStatus } from "../../lib/notifications";
import { updateDoc } from "firebase/firestore";

interface HeaderProps {
  userId?: string;
  onAcceptChallenge?: (betId: string) => void;
  onDeclineChallenge?: (betId: string) => void;
}

export function Header({ userId, onAcceptChallenge, onDeclineChallenge }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Fetch user when userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: userId,
            ...userData,
          } as any);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  // Auth listener fallback
  useEffect(() => {
    if (userId) return; // Already have userId from props

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Handle accepting H2H challenge from notification
  const handleAcceptChallenge = async (betId: string) => {
    if (onAcceptChallenge) {
      onAcceptChallenge(betId);
      return;
    }

    const currentUserId = userId || user?.uid;
    if (!currentUserId) return;

    try {
      const betRef = doc(db, "bets", betId);
      const betSnap = await getDoc(betRef);

      if (!betSnap.exists()) {
        alert("Challenge not found");
        return;
      }

      const betData = betSnap.data();

      // Update bet status to accepted
      await updateDoc(betRef, {
        h2hStatus: "accepted",
        acceptedAt: new Date().toISOString(),
        participants: [...(betData.participants || []), currentUserId],
        updatedAt: new Date().toISOString(),
      });

      // Get user's display name
      const userDocRef = await getDoc(doc(db, "users", currentUserId));
      const userData = userDocRef.exists() ? userDocRef.data() : null;
      const responderName = userData?.displayName ||
        `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
        "Your friend";

      // Notify creator that challenge was accepted
      await notifyChallengeStatus(
        betData.challengerId,
        betId,
        betData.title,
        true,
        responderName
      );

      console.log("Challenge accepted!");
    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert("Failed to accept challenge. Please try again.");
    }
  };

  // Handle declining H2H challenge from notification
  const handleDeclineChallenge = async (betId: string) => {
    if (onDeclineChallenge) {
      onDeclineChallenge(betId);
      return;
    }

    const currentUserId = userId || user?.uid;
    if (!currentUserId) return;

    try {
      const confirmed = confirm("Are you sure you want to decline this challenge?");
      if (!confirmed) return;

      const betRef = doc(db, "bets", betId);
      const betSnap = await getDoc(betRef);

      if (!betSnap.exists()) {
        alert("Challenge not found");
        return;
      }

      const betData = betSnap.data();

      // Update bet status to declined
      await updateDoc(betRef, {
        h2hStatus: "declined",
        declinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Get user's display name
      const userDocRef = await getDoc(doc(db, "users", currentUserId));
      const userData = userDocRef.exists() ? userDocRef.data() : null;
      const responderName = userData?.displayName ||
        `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
        "Your friend";

      // Notify creator that challenge was declined
      await notifyChallengeStatus(
        betData.challengerId,
        betId,
        betData.title,
        false,
        responderName
      );

      console.log("Challenge declined");
    } catch (error) {
      console.error("Error declining challenge:", error);
      alert("Failed to decline challenge. Please try again.");
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: "'Montserrat', sans-serif",
        borderBottom: "1px solid #27272A",
      }}
    >
      <div
        className="flex items-center justify-between h-full"
        style={{
          padding: "0 24px",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => router.push("/home")}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: "800",
              color: "#FFFFFF",
              letterSpacing: "0.5px",
              textShadow: "rgba(0,0,0,0.25) 0px 4px 4px",
            }}
          >
            SIDEBET
          </span>
        </div>

        {/* Notification Bell */}
        <div>
          {userId ? (
            <NotificationBell
              userId={userId}
              onAcceptChallenge={handleAcceptChallenge}
              onDeclineChallenge={handleDeclineChallenge}
            />
          ) : (
            <Bell
              size={20}
              color="white"
              style={{ cursor: "pointer" }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
