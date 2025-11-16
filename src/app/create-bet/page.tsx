"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { Users, Swords, Check } from "lucide-react";

function CreateBetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  // Destination selection
  const [betDestination, setBetDestination] = useState<"group" | "h2h">("group");

  // Group betting
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // H2H betting
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [h2hOdds, setH2hOdds] = useState({ challenger: 1, challengee: 1 });
  const [h2hInGroup, setH2hInGroup] = useState(false);
  const [h2hGroupSelection, setH2hGroupSelection] = useState<any>(null);

  // Bet details
  const [currentStep, setCurrentStep] = useState(1);
  const [betType, setBetType] = useState<"binary" | "multiple_choice" | "over_under">("binary");
  const [betTitle, setBetTitle] = useState("");
  const [betDescription, setBetDescription] = useState("");
  const [betAmount, setBetAmount] = useState(10);
  const [closingDate, setClosingDate] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState(["", ""]);
  const [overUnderLine, setOverUnderLine] = useState(0);

  const [isCreating, setIsCreating] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load groups
  useEffect(() => {
    if (!user) return;

    const loadGroups = async () => {
      const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", user.uid)
      );
      const snapshot = await getDocs(groupsQuery);
      const groupsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupsData);
    };

    loadGroups();
  }, [user]);

  // Load friends
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        // Get accepted friendships
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

        // Get friend user data
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

  // Check for pre-selected friend from Friends page
  useEffect(() => {
    const isH2H = searchParams.get("h2h") === "true";
    const friendId = searchParams.get("friendId");

    if (isH2H) {
      setBetDestination("h2h");

      if (friendId && friends.length > 0) {
        const friend = friends.find(f => f.uid === friendId);
        if (friend) {
          setSelectedFriend(friend);
        }
      }
    }
  }, [searchParams, friends]);

  // Create H2H bet
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

      const betData: any = {
        title: betTitle,
        description: betDescription,
        type: betType,
        creatorId: user.uid,
        createdAt: new Date().toISOString(),
        closingAt: closingDateTime.toISOString(),
        status: "OPEN",

        // H2H specific
        isH2H: true,
        challengerId: user.uid,
        challengeeId: selectedFriend.uid,
        challengerName: user.displayName || `${user.firstName} ${user.lastName}`,
        challengeeName: selectedFriend.displayName || `${selectedFriend.firstName} ${selectedFriend.lastName}`,
        h2hOdds: h2hOdds,
        h2hStatus: "pending",
        betAmount: betAmount,

        // Group (optional)
        groupId: h2hInGroup && h2hGroupSelection ? h2hGroupSelection.id : null,

        // Initialize
        picks: {},
        participants: [],
        winners: []
      };

      // Add type-specific fields
      if (betType === "binary") {
        betData.options = ["YES", "NO"];
      } else if (betType === "multiple_choice") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "over_under") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      const betRef = await addDoc(collection(db, "bets"), betData);

      // Create activity if in group
      if (h2hInGroup && h2hGroupSelection) {
        await addDoc(collection(db, "activities"), {
          groupId: h2hGroupSelection.id,
          type: "bet_created",
          userId: user.uid,
          userName: user.displayName || `${user.firstName} ${user.lastName}`,
          betId: betRef.id,
          betTitle: betTitle,
          timestamp: new Date().toISOString()
        });
      }

      alert(`✅ Challenge sent to ${selectedFriend.displayName || selectedFriend.firstName}!`);
      router.push("/home");

    } catch (error: any) {
      console.error("Error creating H2H bet:", error);
      alert(`Failed to create challenge: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Create regular group bet
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
        winners: []
      };

      // Add type-specific fields
      if (betType === "binary") {
        betData.options = ["YES", "NO"];
      } else if (betType === "multiple_choice") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "over_under") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      const betRef = await addDoc(collection(db, "bets"), betData);

      // Create activity
      await addDoc(collection(db, "activities"), {
        groupId: selectedGroup.id,
        type: "bet_created",
        userId: user.uid,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        betId: betRef.id,
        betTitle: betTitle,
        timestamp: new Date().toISOString()
      });

      alert("✅ Bet created!");
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Create Bet</h1>

        {/* Step 1: Choose Destination */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Where do you want to post this bet?
            </h2>

            <div className="space-y-3 mb-6">
              {/* Post to Group */}
              <button
                onClick={() => setBetDestination("group")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  betDestination === "group"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-5 h-5 ${betDestination === "group" ? "text-orange-500" : "text-zinc-400"}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${betDestination === "group" ? "text-orange-500" : "text-white"}`}>
                      Post to Group
                    </p>
                    <p className="text-xs text-zinc-400">
                      Share with your group members
                    </p>
                  </div>
                </div>
              </button>

              {/* Challenge Friend to H2H */}
              <button
                onClick={() => setBetDestination("h2h")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  betDestination === "h2h"
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Swords className={`w-5 h-5 ${betDestination === "h2h" ? "text-purple-500" : "text-zinc-400"}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${betDestination === "h2h" ? "text-purple-500" : "text-white"}`}>
                      Challenge Friend to H2H
                    </p>
                    <p className="text-xs text-zinc-400">
                      One-on-one bet with a friend
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* If Group selected */}
            {betDestination === "group" && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-white mb-3">Select Group</h3>
                <div className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-zinc-400 text-sm py-4">
                      You're not in any groups yet. Join or create a group first.
                    </p>
                  ) : (
                    groups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          selectedGroup?.id === group.id
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{group.name}</span>
                          {selectedGroup?.id === group.id && (
                            <Check className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* If H2H selected */}
            {betDestination === "h2h" && (
              <>
                {/* Friend Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white mb-3">Choose Your Opponent</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {friends.length === 0 ? (
                      <p className="text-zinc-400 text-sm py-4">
                        You don't have any friends yet. Add friends to challenge them!
                      </p>
                    ) : (
                      friends.map(friend => (
                        <button
                          key={friend.uid}
                          onClick={() => setSelectedFriend(friend)}
                          className={`w-full p-3 rounded-lg border transition-all ${
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

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* 1:1 Even */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 1, challengee: 1 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 1 && h2hOdds.challengee === 1
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">1:1</p>
                      <p className="text-zinc-500 text-xs">Even</p>
                    </button>

                    {/* 2:1 */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 2, challengee: 1 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 2 && h2hOdds.challengee === 1
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">2:1</p>
                      <p className="text-zinc-500 text-xs">You favor</p>
                    </button>

                    {/* 1:2 */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 1, challengee: 2 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 1 && h2hOdds.challengee === 2
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">1:2</p>
                      <p className="text-zinc-500 text-xs">They favor</p>
                    </button>

                    {/* 3:1 */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 3, challengee: 1 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 3 && h2hOdds.challengee === 1
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">3:1</p>
                    </button>

                    {/* 4:1 */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 4, challengee: 1 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 4 && h2hOdds.challengee === 1
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">4:1</p>
                    </button>

                    {/* 1:4 */}
                    <button
                      onClick={() => setH2hOdds({ challenger: 1, challengee: 4 })}
                      className={`p-3 rounded-lg border transition-all ${
                        h2hOdds.challenger === 1 && h2hOdds.challengee === 4
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <p className="text-white text-sm font-semibold">1:4</p>
                    </button>
                  </div>

                  {/* Odds explanation */}
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

                {/* Optional: Post to Group */}
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
                    <div className="space-y-2">
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => setH2hGroupSelection(group)}
                          className={`w-full p-3 rounded-lg border transition-all text-left ${
                            h2hGroupSelection?.id === group.id
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-zinc-800 bg-zinc-900"
                          }`}
                        >
                          <span className="text-white text-sm">{group.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Next Button */}
            <button
              onClick={() => setCurrentStep(2)}
              disabled={
                (betDestination === "group" && !selectedGroup) ||
                (betDestination === "h2h" && !selectedFriend)
              }
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Bet Details */}
        {currentStep === 2 && (
          <div>
            {/* Bet Type Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white mb-3">Bet Type</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setBetType("binary")}
                  className={`p-3 rounded-lg border transition-all ${
                    betType === "binary"
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <p className={`text-sm font-semibold ${betType === "binary" ? "text-orange-500" : "text-white"}`}>
                    Yes/No
                  </p>
                </button>

                <button
                  onClick={() => setBetType("multiple_choice")}
                  className={`p-3 rounded-lg border transition-all ${
                    betType === "multiple_choice"
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <p className={`text-sm font-semibold ${betType === "multiple_choice" ? "text-orange-500" : "text-white"}`}>
                    Multiple
                  </p>
                </button>

                <button
                  onClick={() => setBetType("over_under")}
                  className={`p-3 rounded-lg border transition-all ${
                    betType === "over_under"
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <p className={`text-sm font-semibold ${betType === "over_under" ? "text-orange-500" : "text-white"}`}>
                    Over/Under
                  </p>
                </button>
              </div>
            </div>

            {/* Bet Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Bet Title *
              </label>
              <input
                type="text"
                value={betTitle}
                onChange={(e) => setBetTitle(e.target.value)}
                placeholder="e.g., Will it rain tomorrow?"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Bet Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Description (optional)
              </label>
              <textarea
                value={betDescription}
                onChange={(e) => setBetDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Multiple Choice Options */}
            {betType === "multiple_choice" && (
              <div className="mb-6">
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
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ))}
                <button
                  onClick={() => setMultipleChoiceOptions([...multipleChoiceOptions, ""])}
                  className="text-orange-500 text-sm hover:text-orange-600"
                >
                  + Add Option
                </button>
              </div>
            )}

            {/* Over/Under Line */}
            {betType === "over_under" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Line
                </label>
                <input
                  type="number"
                  value={overUnderLine}
                  onChange={(e) => setOverUnderLine(Number(e.target.value))}
                  placeholder="e.g., 50.5"
                  step="0.5"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {/* Closing Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Closing Date *
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
              >
                Back
              </button>

              <button
                onClick={handleSubmit}
                disabled={isCreating || !betTitle || !closingDate || !closingTime}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors"
              >
                {isCreating ? "Creating..." : "Create Bet"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateBetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    }>
      <CreateBetContent />
    </Suspense>
  );
}
