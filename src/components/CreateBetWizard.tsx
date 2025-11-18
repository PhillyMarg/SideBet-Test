"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Users, Swords, Check, ChevronDown } from "lucide-react";

interface CreateBetWizardProps {
  user: any;
  onClose?: () => void;
  preSelectedFriend?: any;
}

export default function CreateBetWizard({ user, onClose, preSelectedFriend }: CreateBetWizardProps) {
  const router = useRouter();

  // STEP CONTROL - 3 steps
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Destination (H2H vs Group) - NOW FIRST
  const [betDestination, setBetDestination] = useState<"group" | "h2h" | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(preSelectedFriend || null);

  // H2H specific
  const [h2hOdds, setH2hOdds] = useState({ challenger: 1, challengee: 1 });
  const [h2hInGroup, setH2hInGroup] = useState(false);
  const [h2hGroupSelection, setH2hGroupSelection] = useState<any>(null);

  // STEP 2: Bet Type - NOW SECOND
  const [betType, setBetType] = useState<"YES_NO" | "CLOSEST_GUESS" | "OVER_UNDER">("YES_NO");

  // STEP 3: Bet Details - NOW THIRD
  const [betTitle, setBetTitle] = useState("");
  const [betDescription, setBetDescription] = useState("");
  const [betAmount, setBetAmount] = useState(10);
  const [closingDate, setClosingDate] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState(["", ""]);
  const [overUnderLine, setOverUnderLine] = useState(0);

  const [isCreating, setIsCreating] = useState(false);

  // Theme color - PURPLE for H2H, ORANGE for Group
  const themeColor = betDestination === "h2h" ? "purple" : "orange";

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

  // Load friends
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        const friendshipsQuery = query(
          collection(db, "friendships"),
          where("status", "==", "accepted")
        );
        const snapshot = await getDocs(friendshipsQuery);

        const friendIds: string[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.user1Id === user.uid) {
            friendIds.push(data.user2Id);
          } else if (data.user2Id === user.uid) {
            friendIds.push(data.user1Id);
          }
        });

        const friendsData = await Promise.all(
          friendIds.map(async (id) => {
            const userDoc = await getDoc(doc(db, "users", id));
            return { uid: id, ...userDoc.data() };
          })
        );

        setFriends(friendsData);
      } catch (error) {
        console.error("Error loading friends:", error);
      }
    };

    loadFriends();
  }, [user]);

  // If pre-selected friend, auto-select H2H
  useEffect(() => {
    if (preSelectedFriend) {
      setBetDestination("h2h");
      setSelectedFriend(preSelectedFriend);
    }
  }, [preSelectedFriend]);

  const createH2HBet = async () => {
    if (!user || !selectedFriend) {
      alert("Please select a friend to challenge");
      return;
    }

    if (!betTitle.trim()) {
      alert("Please enter a bet title");
      return;
    }

    if (!closingDate || !closingTime) {
      alert("Please set a closing date and time");
      return;
    }

    setIsCreating(true);

    try {
      const closingDateTime = new Date(`${closingDate}T${closingTime}`);

      // ======= ENHANCED DEBUG LOGGING =======
      console.log("======= H2H BET CREATION DEBUG =======");
      console.log("Full user object:", user);
      console.log("user.email:", user?.email);
      console.log("user.displayName:", user?.displayName);
      console.log("user.firstName:", user?.firstName);
      console.log("user.lastName:", user?.lastName);
      console.log("user.name:", user?.name);

      console.log("Selected friend:", selectedFriend);
      console.log("friend.email:", selectedFriend?.email);
      console.log("friend.displayName:", selectedFriend?.displayName);
      console.log("friend.firstName:", selectedFriend?.firstName);
      console.log("friend.lastName:", selectedFriend?.lastName);
      console.log("friend.name:", selectedFriend?.name);
      console.log("======================================");

      // Build proper display names with STRICT validation to prevent emails
      let challengerDisplayName = "";
      let challengeeDisplayName = "";

      // ===== CHALLENGER NAME =====
      if (user.firstName && user.lastName) {
        challengerDisplayName = `${user.firstName} ${user.lastName}`;
      } else if (user.displayName && !user.displayName.includes('@')) {
        // Only use displayName if it's NOT an email
        challengerDisplayName = user.displayName;
      } else if (user.firstName) {
        challengerDisplayName = user.firstName;
      } else if (user.lastName) {
        challengerDisplayName = user.lastName;
      } else {
        console.error("❌ Cannot find proper name for user:", user);
        alert("Error: Your profile is missing a name. Please update your profile with your first and last name before creating bets.");
        setIsCreating(false);
        return;
      }

      // ===== CHALLENGEE NAME =====
      if (selectedFriend.firstName && selectedFriend.lastName) {
        challengeeDisplayName = `${selectedFriend.firstName} ${selectedFriend.lastName}`;
      } else if (selectedFriend.displayName && !selectedFriend.displayName.includes('@')) {
        // Only use displayName if it's NOT an email
        challengeeDisplayName = selectedFriend.displayName;
      } else if (selectedFriend.firstName) {
        challengeeDisplayName = selectedFriend.firstName;
      } else if (selectedFriend.lastName) {
        challengeeDisplayName = selectedFriend.lastName;
      } else {
        console.warn("⚠️ Cannot find proper name for friend, using fallback");
        challengeeDisplayName = selectedFriend.email || "Friend";
      }

      // ===== VALIDATION: PREVENT EMAILS FROM BEING SAVED =====
      if (challengerDisplayName.includes('@')) {
        console.error("❌ ERROR: Trying to save email as challenger name!");
        alert("Error: Cannot use email as your name. Please update your profile with your first and last name.");
        setIsCreating(false);
        return;
      }

      if (challengeeDisplayName.includes('@')) {
        console.error("❌ ERROR: Trying to save email as challengee name!");
        alert(`Error: Friend's profile is missing a name. Please ask them to update their profile.`);
        setIsCreating(false);
        return;
      }

      console.log("✅ Names validated and ready to save:", {
        challengerName: challengerDisplayName,
        challengeeName: challengeeDisplayName
      });

      const betData: any = {
        title: betTitle,
        description: betDescription,
        type: betType,
        creatorId: user.uid,
        createdAt: new Date().toISOString(),
        closingAt: closingDateTime.toISOString(),
        status: "OPEN",

        isH2H: true,
        challengerId: user.uid,
        challengeeId: selectedFriend.uid,
        challengerName: challengerDisplayName,
        challengeeName: challengeeDisplayName,
        h2hOdds: h2hOdds,
        h2hStatus: "pending",
        betAmount: betAmount,

        groupId: h2hInGroup && h2hGroupSelection ? h2hGroupSelection.id : null,

        picks: {},
        participants: [user.uid], // Challenger is automatically a participant
        winners: []
      };

      if (betType === "YES_NO") {
        betData.options = ["YES", "NO"];
      } else if (betType === "CLOSEST_GUESS") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "OVER_UNDER") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      // CREATE BET
      const betRef = await addDoc(collection(db, "bets"), betData);
      console.log("H2H bet created:", betRef.id);

      // CREATE NOTIFICATION FOR CHALLENGEE - CRITICAL
      await addDoc(collection(db, "notifications"), {
        userId: selectedFriend.uid,
        type: "h2h_challenge",
        title: "New Challenge!",
        message: `${challengerDisplayName} challenged you: "${betTitle}"`,
        link: `/bets/${betRef.id}`,
        betId: betRef.id,
        betTitle: betTitle,
        fromUserId: user.uid,
        fromUserName: challengerDisplayName,
        read: false,
        createdAt: new Date().toISOString()
      });

      console.log("Notification sent to:", selectedFriend.uid);

      alert(`✅ Challenge sent to ${selectedFriend.displayName || selectedFriend.firstName}!`);
      if (onClose) onClose();
      router.push("/home");

    } catch (error: any) {
      console.error("Error creating H2H bet:", error);
      alert(`Failed to create challenge: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const createGroupBet = async () => {
    if (!selectedGroup) {
      alert("Please select a group");
      return;
    }

    if (!betTitle.trim()) {
      alert("Please enter a bet title");
      return;
    }

    if (!closingDate || !closingTime) {
      alert("Please set a closing date and time");
      return;
    }

    setIsCreating(true);

    try {
      const closingDateTime = new Date(`${closingDate}T${closingTime}`);

      const betData: any = {
        title: betTitle,
        description: betDescription,
        type: betType,
        creatorId: user.uid,
        groupId: selectedGroup.id,
        createdAt: new Date().toISOString(),
        closingAt: closingDateTime.toISOString(),
        status: "OPEN",
        isH2H: false,
        picks: {},
        participants: [],
        winners: [],
        settings: selectedGroup.settings
      };

      if (betType === "YES_NO") {
        betData.options = ["YES", "NO"];
      } else if (betType === "CLOSEST_GUESS") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "OVER_UNDER") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      // CREATE BET
      const betRef = await addDoc(collection(db, "bets"), betData);
      console.log("Group bet created:", betRef.id);

      // BUILD CREATOR DISPLAY NAME - PREFER firstName + lastName, SKIP displayName if it's an email
      let creatorDisplayName = "";
      if (user.firstName && user.lastName) {
        creatorDisplayName = `${user.firstName} ${user.lastName}`;
      } else if (user.displayName && !user.displayName.includes('@')) {
        creatorDisplayName = user.displayName;
      } else if (user.firstName) {
        creatorDisplayName = user.firstName;
      } else if (user.lastName) {
        creatorDisplayName = user.lastName;
      } else {
        creatorDisplayName = 'Someone';
      }

      // SEND NOTIFICATIONS TO ALL GROUP MEMBERS (except creator)
      const memberIds = selectedGroup.memberIds || [];
      const membersToNotify = memberIds.filter((memberId: string) => memberId !== user.uid);

      console.log(`Sending notifications to ${membersToNotify.length} group members`);

      const notificationPromises = membersToNotify.map((memberId: string) =>
        addDoc(collection(db, "notifications"), {
          userId: memberId,
          type: "activity",
          title: "New Bet in Group",
          message: `${creatorDisplayName} created "${betTitle}" in ${selectedGroup.name}`,
          link: `/bets/${betRef.id}`,
          betId: betRef.id,
          betTitle: betTitle,
          fromUserId: user.uid,
          fromUserName: creatorDisplayName,
          read: false,
          createdAt: new Date().toISOString()
        })
      );

      await Promise.all(notificationPromises);
      console.log(`Notifications sent to ${membersToNotify.length} members`);

      alert("✅ Bet created!");
      if (onClose) onClose();
      router.push("/home");

    } catch (error: any) {
      console.error("Error creating bet:", error);
      alert(`Failed to create bet: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = () => {
    if (betDestination === "h2h") {
      createH2HBet();
    } else {
      createGroupBet();
    }
  };

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-1 rounded-full transition-colors ${
                step <= currentStep
                  ? betDestination === "h2h"
                    ? 'bg-purple-500'
                    : 'bg-orange-500'
                  : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Step {currentStep} of 3
        </p>
      </div>

      {/* ===== STEP 1: DESTINATION (H2H vs GROUP) ===== */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Who's this bet for?
          </h2>

          {/* Destination Selection */}
          <div className="space-y-3 mb-6">
            {/* Post to Group */}
            <button
              onClick={() => {
                setBetDestination("group");
                setSelectedFriend(null);
              }}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                betDestination === "group"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${betDestination === "group" ? "text-orange-500" : "text-zinc-400"}`} />
                <div className="flex-1">
                  <p className={`font-semibold ${betDestination === "group" ? "text-orange-500" : "text-white"}`}>
                    Post to Group
                  </p>
                  <p className="text-xs text-zinc-400">
                    Share with group members
                  </p>
                </div>
              </div>
            </button>

            {/* Challenge Friend */}
            <button
              onClick={() => {
                setBetDestination("h2h");
                setSelectedGroup(null);
              }}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                betDestination === "h2h"
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <Swords className={`w-5 h-5 ${betDestination === "h2h" ? "text-purple-500" : "text-zinc-400"}`} />
                <div className="flex-1">
                  <p className={`font-semibold ${betDestination === "h2h" ? "text-purple-500" : "text-white"}`}>
                    Challenge Friend
                  </p>
                  <p className="text-xs text-zinc-400">
                    Head-to-head with a friend
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Group Dropdown */}
          {betDestination === "group" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Select Group
              </label>
              <div className="relative">
                <select
                  value={selectedGroup?.id || ""}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setSelectedGroup(group);
                  }}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-orange-500"
                >
                  <option value="">Choose a group...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              </div>
              {groups.length === 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  You're not in any groups yet. Join or create one first.
                </p>
              )}
            </div>
          )}

          {/* Friend Selection */}
          {betDestination === "h2h" && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Choose Your Opponent
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friends.length === 0 ? (
                    <p className="text-zinc-400 text-sm py-4 text-center">
                      No friends yet. Add friends to challenge them!
                    </p>
                  ) : (
                    friends.map(friend => (
                      <button
                        key={friend.uid}
                        onClick={() => setSelectedFriend(friend)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          selectedFriend?.uid === friend.uid
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              friend.isOnline ? "bg-green-500" : "bg-red-500"
                            }`} />
                            <span className="text-white text-sm">
                              {friend.displayName || `${friend.firstName} ${friend.lastName}`}
                            </span>
                          </div>
                          {selectedFriend?.uid === friend.uid && (
                            <Check className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Wager Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Wager Amount ($)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Odds Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Set Odds
                </label>

                {/* Preset Odds Tiles */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { challenger: 1, challengee: 1, label: "1:1", desc: "Even" },
                    { challenger: 2, challengee: 1, label: "2:1", desc: "You favor" },
                    { challenger: 1, challengee: 2, label: "1:2", desc: "They favor" },
                    { challenger: 3, challengee: 1, label: "3:1", desc: "Long" },
                    { challenger: 4, challengee: 1, label: "4:1", desc: "Very long" },
                    { challenger: 1, challengee: 4, label: "1:4", desc: "Underdog" }
                  ].map((odds) => (
                    <button
                      key={`${odds.challenger}:${odds.challengee}`}
                      onClick={() => setH2hOdds({ challenger: odds.challenger, challengee: odds.challengee })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === odds.challenger && h2hOdds.challengee === odds.challengee
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${
                        h2hOdds.challenger === odds.challenger && h2hOdds.challengee === odds.challengee
                          ? "text-purple-500" : "text-white"
                      }`}>
                        {odds.label}
                      </p>
                      <p className="text-xs text-zinc-500">{odds.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Custom Odds Input */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Or enter custom odds:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g., 5:2"
                      value={`${h2hOdds.challenger}:${h2hOdds.challengee}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and colon
                        const cleanValue = value.replace(/[^0-9:]/g, '');

                        // Check format X:X
                        const match = cleanValue.match(/^(\d+):(\d+)$/);
                        if (match) {
                          const challenger = parseInt(match[1]);
                          const challengee = parseInt(match[2]);

                          // Validate numbers are positive and reasonable (1-99)
                          if (challenger > 0 && challenger < 100 && challengee > 0 && challengee < 100) {
                            setH2hOdds({ challenger, challengee });
                          }
                        } else if (cleanValue === '' || cleanValue.match(/^\d*:?\d*$/)) {
                          // Allow partial input while typing (e.g., "5" or "5:")
                          // But don't update h2hOdds yet
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => setH2hOdds({ challenger: 1, challengee: 1 })}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Format: YourOdds:TheirOdds (e.g., 5:2 or 3:1)
                  </p>
                </div>

                {/* Odds Explanation - Updates with custom odds */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-400">
                    {h2hOdds.challenger === h2hOdds.challengee ? (
                      <>Even odds: Both risk ${betAmount} to win ${betAmount}</>
                    ) : h2hOdds.challenger > h2hOdds.challengee ? (
                      <>You risk ${betAmount * h2hOdds.challenger} to win ${betAmount * h2hOdds.challengee}</>
                    ) : (
                      <>They risk ${betAmount * h2hOdds.challengee} to win ${betAmount * h2hOdds.challenger}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Optional: Post to Group - ONLY MUTUAL GROUPS */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={h2hInGroup}
                    onChange={(e) => setH2hInGroup(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-white">
                    Post to a group (others can see but not join)
                  </span>
                </label>

                {h2hInGroup && (
                  <>
                    {(() => {
                      // Filter to only groups where BOTH users are members
                      const mutualGroups = groups.filter(group =>
                        group.memberIds?.includes(selectedFriend.uid)
                      );

                      return mutualGroups.length > 0 ? (
                        <div className="relative">
                          <select
                            value={h2hGroupSelection?.id || ""}
                            onChange={(e) => {
                              const group = mutualGroups.find(g => g.id === e.target.value);
                              setH2hGroupSelection(group);
                            }}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500"
                          >
                            <option value="">Choose a mutual group...</option>
                            {mutualGroups.map(group => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 mt-2 p-3 bg-zinc-800 rounded-lg">
                          You and {selectedFriend.displayName || selectedFriend.firstName} have no mutual groups
                        </p>
                      );
                    })()}
                  </>
                )}
              </div>
            </>
          )}

          {/* Next Button */}
          <button
            onClick={() => {
              if (!betDestination) {
                alert("Please select where to post this bet");
                return;
              }
              if (betDestination === "group" && !selectedGroup) {
                alert("Please select a group");
                return;
              }
              if (betDestination === "h2h" && !selectedFriend) {
                alert("Please select a friend to challenge");
                return;
              }
              setCurrentStep(2);
            }}
            disabled={
              !betDestination ||
              (betDestination === "group" && !selectedGroup) ||
              (betDestination === "h2h" && !selectedFriend)
            }
            className={`w-full py-3 ${themeColor === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors`}
          >
            Next
          </button>
        </div>
      )}

      {/* ===== STEP 2: BET TYPE ===== */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            What type of bet?
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <button
              onClick={() => setBetType("YES_NO")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "YES_NO"
                  ? `border-${themeColor}-500 bg-${themeColor}-500/10`
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "YES_NO" ? `text-${themeColor}-500` : "text-white"}`}>
                Yes/No
              </p>
              <p className="text-xs text-zinc-500">Binary choice</p>
            </button>

            <button
              onClick={() => setBetType("CLOSEST_GUESS")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "CLOSEST_GUESS"
                  ? `border-${themeColor}-500 bg-${themeColor}-500/10`
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "CLOSEST_GUESS" ? `text-${themeColor}-500` : "text-white"}`}>
                Closest Guess
              </p>
              <p className="text-xs text-zinc-500">Numeric guess</p>
            </button>

            <button
              onClick={() => setBetType("OVER_UNDER")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "OVER_UNDER"
                  ? `border-${themeColor}-500 bg-${themeColor}-500/10`
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "OVER_UNDER" ? `text-${themeColor}-500` : "text-white"}`}>
                Over/Under
              </p>
              <p className="text-xs text-zinc-500">Set a line</p>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
            >
              Back
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className={`flex-1 py-3 ${themeColor === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg font-semibold transition-colors`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: BET DETAILS ===== */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Bet Details
          </h2>

          {/* Bet Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">
              Bet Title *
            </label>
            <input
              type="text"
              value={betTitle}
              onChange={(e) => setBetTitle(e.target.value)}
              placeholder="e.g., Will it rain tomorrow?"
              className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none ${
                themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
          </div>

          {/* Bet Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">
              Description (optional)
            </label>
            <textarea
              value={betDescription}
              onChange={(e) => setBetDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none ${
                themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
          </div>

          {/* Closest Guess Options */}
          {betType === "CLOSEST_GUESS" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Options
              </label>
              {multipleChoiceOptions.map((option, index) => (
                <div key={index} className="mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...multipleChoiceOptions];
                      newOptions[index] = e.target.value;
                      setMultipleChoiceOptions(newOptions);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none ${
                      themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
                    }`}
                  />
                </div>
              ))}
              <button
                onClick={() => setMultipleChoiceOptions([...multipleChoiceOptions, ""])}
                className={`${themeColor === 'purple' ? 'text-purple-500 hover:text-purple-600' : 'text-orange-500 hover:text-orange-600'} text-sm`}
              >
                + Add Option
              </button>
            </div>
          )}

          {/* Over/Under Line */}
          {betType === "OVER_UNDER" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Line
              </label>
              <input
                type="number"
                value={overUnderLine}
                onChange={(e) => setOverUnderLine(Number(e.target.value))}
                placeholder="e.g., 50.5"
                step="0.5"
                className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none ${
                  themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
                }`}
              />
            </div>
          )}

          {/* Closing Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">
              Closing Date *
            </label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none ${
                themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
          </div>

          {/* Closing Time */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Closing Time *
            </label>
            <input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className={`w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none ${
                themeColor === 'purple' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
            >
              Back
            </button>

            <button
              onClick={handleSubmit}
              disabled={isCreating || !betTitle || !closingDate || !closingTime}
              className={`flex-1 py-3 ${themeColor === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors`}
            >
              {isCreating ? "Creating..." : "Create Bet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
