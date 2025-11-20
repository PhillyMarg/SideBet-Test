"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  or
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import {
  Search,
  UserPlus,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { notifyFriendRequest, notifyFriendRequestAccepted } from "@/lib/notifications";
import { Header } from "@/components/layout/Header";

// Lazy load CreateBetWizard
const CreateBetWizard = lazy(() => import("@/components/CreateBetWizard"));

interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isOnline: boolean;
  lastActive: string;
}

interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: "pending" | "accepted";
  requestedBy: string;
  createdAt: string;
  acceptedAt?: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Friends data
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Create bet wizard state
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [preSelectedFriend, setPreSelectedFriend] = useState<User | null>(null);

  // Collapsible sections
  const [showFriends, setShowFriends] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showIncoming, setShowIncoming] = useState(true);
  const [showSent, setShowSent] = useState(true);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        updateUserPresence(currentUser.uid);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Update user's online status
  const updateUserPresence = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        lastActive: new Date().toISOString(),
        isOnline: true
      });

      // Update presence every 2 minutes
      const interval = setInterval(async () => {
        await updateDoc(userRef, {
          lastActive: new Date().toISOString(),
          isOnline: true
        });
      }, 2 * 60 * 1000);

      // Cleanup on unmount
      return () => {
        clearInterval(interval);
        updateDoc(userRef, { isOnline: false });
      };
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  };

  // Listen to friendships
  useEffect(() => {
    if (!user) return;

    const friendshipsQuery = query(
      collection(db, "friendships"),
      or(
        where("user1Id", "==", user.uid),
        where("user2Id", "==", user.uid)
      )
    );

    const unsubscribe = onSnapshot(friendshipsQuery, async (snapshot) => {
      const friendshipDocs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Friendship[];

      // Accepted friends
      const acceptedFriendships = friendshipDocs.filter(f => f.status === "accepted");
      const friendIds = acceptedFriendships.map(f =>
        f.user1Id === user.uid ? f.user2Id : f.user1Id
      );

      // Fetch friend user data
      const friendsData = await Promise.all(
        friendIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, "users", id));
          return { uid: id, ...userDoc.data() } as User;
        })
      );
      setFriends(friendsData);

      // Incoming requests (others sent to me)
      const incoming = friendshipDocs.filter(
        f => f.status === "pending" && f.requestedBy !== user.uid
      );
      const incomingIds = incoming.map(f =>
        f.user1Id === user.uid ? f.user2Id : f.user1Id
      );
      const incomingData = await Promise.all(
        incomingIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, "users", id));
          return { uid: id, ...userDoc.data() } as User;
        })
      );
      setIncomingRequests(incomingData);

      // Sent requests (I sent to others)
      const sent = friendshipDocs.filter(
        f => f.status === "pending" && f.requestedBy === user.uid
      );
      const sentIds = sent.map(f =>
        f.user1Id === user.uid ? f.user2Id : f.user1Id
      );
      const sentData = await Promise.all(
        sentIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, "users", id));
          return { uid: id, ...userDoc.data() } as User;
        })
      );
      setSentRequests(sentData);
    });

    return () => unsubscribe();
  }, [user]);

  // Load groups
  useEffect(() => {
    if (!user) return;

    const loadGroups = async () => {
      try {
        const groupsQuery = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", user.uid)
        );
        const snapshot = await getDocs(groupsQuery);
        const groupsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setGroups(groupsData);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };

    loadGroups();
  }, [user]);

  // Load suggestions
  useEffect(() => {
    if (!user || groups.length === 0) return;

    const loadSuggestions = async () => {
      try {
        // Get all member IDs from user's groups
        const allMemberIds = new Set<string>();
        groups.forEach(group => {
          group.memberIds?.forEach((memberId: string) => {
            if (memberId !== user.uid) {
              allMemberIds.add(memberId);
            }
          });
        });

        // Get existing friend/request IDs
        const excludeIds = new Set<string>([
          user.uid,
          ...friends.map(f => f.uid),
          ...incomingRequests.map(r => r.uid),
          ...sentRequests.map(r => r.uid)
        ]);

        // Filter to only non-friends
        const suggestionIds = Array.from(allMemberIds).filter(
          id => !excludeIds.has(id)
        );

        // Fetch user data for suggestions
        const suggestionsData = await Promise.all(
          suggestionIds.slice(0, 10).map(async (id) => {
            const userDoc = await getDoc(doc(db, "users", id));
            if (userDoc.exists()) {
              return { uid: id, ...userDoc.data() } as User;
            }
            return null;
          })
        );

        // Filter out nulls and set
        setSuggestions(suggestionsData.filter(s => s !== null) as User[]);

      } catch (error) {
        console.error("Error loading suggestions:", error);
      }
    };

    loadSuggestions();
  }, [user, groups, friends, incomingRequests, sentRequests]);

  // Helper to count mutual groups
  const getMutualGroupsCount = (userId: string): number => {
    return groups.filter(group =>
      group.memberIds?.includes(userId)
    ).length;
  };

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);

      const results = snapshot.docs
        .map(d => ({ uid: d.id, ...d.data() } as User))
        .filter(u => {
          const query = searchQuery.toLowerCase();
          const email = u.email.toLowerCase();
          const displayName = u.displayName?.toLowerCase() || "";
          const username = `${u.firstName} ${u.lastName}`.toLowerCase();

          return (
            u.uid !== user?.uid && // Don't show self
            (email.includes(query) ||
             displayName.includes(query) ||
             username.includes(query))
          );
        })
        .slice(0, 10); // Limit to 10 results

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      // Check if friendship already exists
      const existingQuery = query(
        collection(db, "friendships"),
        or(
          where("user1Id", "==", user.uid),
          where("user2Id", "==", user.uid)
        )
      );

      const existingSnapshot = await getDocs(existingQuery);
      const existing = existingSnapshot.docs.find(d => {
        const data = d.data();
        return (
          (data.user1Id === user.uid && data.user2Id === friendId) ||
          (data.user2Id === user.uid && data.user1Id === friendId)
        );
      });

      if (existing) {
        alert("Friend request already sent or you're already friends");
        return;
      }

      // Create friendship
      const friendshipRef = await addDoc(collection(db, "friendships"), {
        user1Id: user.uid,
        user2Id: friendId,
        status: "pending",
        requestedBy: user.uid,
        createdAt: new Date().toISOString()
      });

      // Get sender's name for notification
      const senderDoc = await getDoc(doc(db, "users", user.uid));
      const senderData = senderDoc.data();
      const senderName = senderData?.displayName || `${senderData?.firstName || ""} ${senderData?.lastName || ""}`.trim();

      // CREATE NOTIFICATION
      await notifyFriendRequest(
        friendId,
        senderName || "Someone",
        friendshipRef.id
      );

      alert("✅ Friend request sent!");
      setSearchQuery("");
      setSearchResults([]);
      setShowAddModal(false);

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.uid !== friendId));

    } catch (error: any) {
      console.error("Error sending friend request:", error);
      alert(`Failed to send request: ${error.message}`);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      // Find the friendship
      const friendshipsQuery = query(
        collection(db, "friendships"),
        or(
          where("user1Id", "==", user.uid),
          where("user2Id", "==", user.uid)
        )
      );

      const snapshot = await getDocs(friendshipsQuery);
      const friendshipDoc = snapshot.docs.find(d => {
        const data = d.data();
        return (
          (data.user1Id === user.uid && data.user2Id === friendId) ||
          (data.user2Id === user.uid && data.user1Id === friendId)
        );
      });

      if (!friendshipDoc) return;

      // Update to accepted
      await updateDoc(doc(db, "friendships", friendshipDoc.id), {
        status: "accepted",
        acceptedAt: new Date().toISOString()
      });

      // Get accepter's name and send notification to the original requester
      const accepterDoc = await getDoc(doc(db, "users", user.uid));
      const accepterData = accepterDoc.data();
      const accepterName = accepterData?.displayName || `${accepterData?.firstName || ""} ${accepterData?.lastName || ""}`.trim();

      // Notify the person who sent the friend request
      const friendshipData = friendshipDoc.data();
      const requesterId = friendshipData.requestedBy;
      await notifyFriendRequestAccepted(
        requesterId,
        accepterName || "Someone"
      );

      alert("✅ Friend request accepted!");

    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      alert(`Failed to accept request: ${error.message}`);
    }
  };

  // Decline friend request
  const declineFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const friendshipsQuery = query(
        collection(db, "friendships"),
        or(
          where("user1Id", "==", user.uid),
          where("user2Id", "==", user.uid)
        )
      );

      const snapshot = await getDocs(friendshipsQuery);
      const friendshipDoc = snapshot.docs.find(d => {
        const data = d.data();
        return (
          (data.user1Id === user.uid && data.user2Id === friendId) ||
          (data.user2Id === user.uid && data.user1Id === friendId)
        );
      });

      if (!friendshipDoc) return;

      // Delete the friendship
      await deleteDoc(doc(db, "friendships", friendshipDoc.id));

      alert("Friend request declined");

    } catch (error: any) {
      console.error("Error declining friend request:", error);
      alert(`Failed to decline request: ${error.message}`);
    }
  };

  // Cancel sent request
  const cancelFriendRequest = async (friendId: string) => {
    await declineFriendRequest(friendId); // Same logic
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Header userId={user?.uid} />
      <div className="min-h-screen bg-[#0a0a0a]" style={{ paddingTop: "100px" }}>
      {/* Page Title */}
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Friends</h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>
      </div>

      {/* My Friends Section */}
      <div className="px-4 sm:px-6 py-4">
        <button
          onClick={() => setShowFriends(!showFriends)}
          className="flex items-center gap-2 mb-3 text-white hover:text-orange-500 transition-colors"
        >
          {showFriends ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h2 className="text-lg font-semibold">
            My Friends ({friends.length})
          </h2>
        </button>

        {showFriends && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="text-zinc-400 text-sm py-4">
                No friends yet. Add some friends to start challenging them!
              </p>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.uid}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {/* Online Status */}
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      friend.isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} />

                    {/* Name */}
                    <div>
                      <p className="text-white font-medium text-sm">
                        {friend.displayName || `${friend.firstName} ${friend.lastName}`}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  {/* Challenge Button */}
                  <button
                    onClick={() => {
                      console.log("Challenge button clicked for friend:", friend);
                      setPreSelectedFriend(friend);
                      setShowCreateBet(true);
                      console.log("Create Bet Wizard should open with H2H pre-selected");
                    }}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Challenge
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Suggestions Section */}
      <div className="px-4 sm:px-6 py-4 border-t border-zinc-800">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-2 mb-3 text-white hover:text-orange-500 transition-colors"
        >
          {showSuggestions ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h2 className="text-lg font-semibold">
            Suggestions ({suggestions.length})
          </h2>
        </button>

        {showSuggestions && (
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <p className="text-zinc-400 text-sm py-4">
                No suggestions right now. Join more groups to meet new people!
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-500 mb-3">
                  People in your groups who you might know
                </p>

                {suggestions.map(suggestion => {
                  const mutualGroups = groups.filter(g => g.memberIds?.includes(suggestion.uid));

                  return (
                    <div
                      key={suggestion.uid}
                      className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-500 text-sm font-bold">
                              {suggestion.firstName?.charAt(0) || suggestion.displayName?.charAt(0) || "?"}
                            </span>
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                              {suggestion.displayName || `${suggestion.firstName} ${suggestion.lastName}`}
                            </p>
                          </div>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={() => sendFriendRequest(suggestion.uid)}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>

                      {/* Mutual Groups */}
                      {mutualGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-11">
                          {mutualGroups.slice(0, 3).map(group => (
                            <span
                              key={group.id}
                              className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full"
                            >
                              {group.name}
                            </span>
                          ))}
                          {mutualGroups.length > 3 && (
                            <span className="text-[10px] px-2 py-0.5 text-zinc-500">
                              +{mutualGroups.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Pending Requests Section */}
      <div className="px-4 sm:px-6 py-4 border-t border-zinc-800">
        <button
          onClick={() => setShowIncoming(!showIncoming)}
          className="flex items-center gap-2 mb-3 text-white hover:text-orange-500 transition-colors"
        >
          {showIncoming ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h2 className="text-lg font-semibold">
            Pending Requests ({incomingRequests.length})
          </h2>
        </button>

        {showIncoming && (
          <div className="space-y-2">
            {incomingRequests.length === 0 ? (
              <p className="text-zinc-400 text-sm py-4">
                No pending requests
              </p>
            ) : (
              incomingRequests.map(requester => (
                <div
                  key={requester.uid}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium text-sm">
                      {requester.displayName || `${requester.firstName} ${requester.lastName}`}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      {requester.email}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(requester.uid)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineFriendRequest(requester.uid)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sent Requests Section */}
      <div className="px-4 sm:px-6 py-4 border-t border-zinc-800">
        <button
          onClick={() => setShowSent(!showSent)}
          className="flex items-center gap-2 mb-3 text-white hover:text-orange-500 transition-colors"
        >
          {showSent ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h2 className="text-lg font-semibold">
            Sent Requests ({sentRequests.length})
          </h2>
        </button>

        {showSent && (
          <div className="space-y-2">
            {sentRequests.length === 0 ? (
              <p className="text-zinc-400 text-sm py-4">
                No sent requests
              </p>
            ) : (
              sentRequests.map(recipient => (
                <div
                  key={recipient.uid}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium text-sm">
                      {recipient.displayName || `${recipient.firstName} ${recipient.lastName}`}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      Pending...
                    </p>
                  </div>

                  <button
                    onClick={() => cancelFriendRequest(recipient.uid)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[61] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-4">
              Add Friend
            </h3>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by email or name..."
                className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              onClick={handleSearch}
              className="w-full mb-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Search
            </button>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-zinc-400 mb-2">Search Results:</p>
                {searchResults.map(result => (
                  <div
                    key={result.uid}
                    className="flex items-center justify-between p-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {result.displayName || `${result.firstName} ${result.lastName}`}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {result.email}
                      </p>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(result.uid)}
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Invite Options */}
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-400 mb-3">Or invite new users:</p>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowInviteModal(true);
                }}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Invite to SideBet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal - Placeholder for now */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-md w-full relative z-[61] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-4">
              Invite Friends to SideBet
            </h3>

            <p className="text-sm text-zinc-400 mb-4">
              Coming soon: Email invites, referral codes, and shareable links!
            </p>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Create Bet Wizard Modal */}
      {showCreateBet && (
        <div
          className="fixed inset-0 flex justify-center items-center z-[60] bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            setShowCreateBet(false);
            setPreSelectedFriend(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto p-5"
          >
            <Suspense fallback={<div className="text-white text-center py-8">Loading...</div>}>
              <CreateBetWizard
                user={user}
                preSelectedFriend={preSelectedFriend}
                onClose={() => {
                  setShowCreateBet(false);
                  setPreSelectedFriend(null);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
