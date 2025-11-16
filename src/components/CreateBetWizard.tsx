"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { Users, Swords, Check, ChevronDown, X } from "lucide-react";

interface CreateBetWizardProps {
  // New interface (for H2H support)
  user?: any;
  preSelectedFriend?: any;

  // Old interface (for backward compatibility)
  isOpen?: boolean;
  groups?: any[];
  onCreateBet?: (betData: any) => Promise<void>;

  // Shared
  onClose?: () => void;
}

export default function CreateBetWizard({
  user: propUser,
  onClose,
  preSelectedFriend,
  isOpen = true,
  groups: propGroups,
  onCreateBet: propOnCreateBet
}: CreateBetWizardProps) {
  const router = useRouter();

  // Determine which interface is being used
  const isOldInterface = propGroups !== undefined && propOnCreateBet !== undefined;

  // Get the current user from auth if not provided (for old interface)
  const [authUser, setAuthUser] = useState<any>(null);
  const user = propUser || authUser;

  // STEP CONTROL - 3 STEPS
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Bet Type
  const [betType, setBetType] = useState<"binary" | "multiple_choice" | "over_under">("binary");

  // STEP 2: Destination (THIS IS WHERE H2H OPTION SHOULD APPEAR)
  const [betDestination, setBetDestination] = useState<"group" | "h2h" | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(preSelectedFriend || null);

  // H2H specific
  const [h2hOdds, setH2hOdds] = useState({ challenger: 1, challengee: 1 });
  const [h2hInGroup, setH2hInGroup] = useState(false);
  const [h2hGroupSelection, setH2hGroupSelection] = useState<any>(null);

  // STEP 3: Bet Details
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

  // Load user from auth if not provided (for old interface)
  useEffect(() => {
    if (propUser || !isOldInterface) return;

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setAuthUser(firebaseUser);
    });

    return () => unsubscribe();
  }, [propUser, isOldInterface]);

  // Load groups (use propGroups if provided, otherwise load from Firestore)
  useEffect(() => {
    if (propGroups) {
      setGroups(propGroups);
      return;
    }

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
        console.log("Loaded groups:", groupsData.length);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };

    loadGroups();
  }, [user, propGroups]);

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
        console.log("Loaded friends:", friendsData.length);
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
      setCurrentStep(2);
    }
  }, [preSelectedFriend]);

  // Auto-select "group" destination if using old interface (no H2H support)
  useEffect(() => {
    if (isOldInterface && betDestination === null) {
      setBetDestination("group");
    }
  }, [isOldInterface, betDestination]);

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

        isH2H: true,
        challengerId: user.uid,
        challengeeId: selectedFriend.uid,
        challengerName: user.displayName || `${user.firstName} ${user.lastName}`,
        challengeeName: selectedFriend.displayName || `${selectedFriend.firstName} ${selectedFriend.lastName}`,
        h2hOdds: h2hOdds,
        h2hStatus: "pending",
        betAmount: betAmount,

        groupId: h2hInGroup && h2hGroupSelection ? h2hGroupSelection.id : null,

        picks: {},
        participants: [],
        winners: []
      };

      if (betType === "binary") {
        betData.options = ["YES", "NO"];
      } else if (betType === "multiple_choice") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "over_under") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      await addDoc(collection(db, "bets"), betData);

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
      // If using old interface, call the prop callback
      if (propOnCreateBet) {
        const closingDateTime = new Date(`${closingDate}T${closingTime}`);

        const legacyBetData: any = {
          title: betTitle,
          description: betDescription,
          type: betType === "binary" ? "YES_NO" : betType === "over_under" ? "OVER_UNDER" : "CLOSEST_GUESS",
          groupId: selectedGroup.id,
          wager: betAmount.toString(),
          line: betType === "over_under" ? overUnderLine.toString() : "",
          closingAt: closingDateTime.toISOString(),
        };

        await propOnCreateBet(legacyBetData);
        if (onClose) onClose();
        return;
      }

      // New interface logic
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

      if (betType === "binary") {
        betData.options = ["YES", "NO"];
      } else if (betType === "multiple_choice") {
        betData.options = multipleChoiceOptions.filter(opt => opt.trim());
      } else if (betType === "over_under") {
        betData.line = overUnderLine;
        betData.options = ["OVER", "UNDER"];
      }

      await addDoc(collection(db, "bets"), betData);

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

  console.log("Current step:", currentStep);
  console.log("Bet destination:", betDestination);

  // Don't render if isOpen is false (for old interface)
  if (!isOpen) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Create Bet</h1>
          {onClose && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
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

      {/* ===== STEP 1: BET TYPE ===== */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            What type of bet?
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <button
              onClick={() => setBetType("binary")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "binary"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "binary" ? "text-orange-500" : "text-white"}`}>
                Yes/No
              </p>
              <p className="text-xs text-zinc-500">Binary choice</p>
            </button>

            <button
              onClick={() => setBetType("multiple_choice")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "multiple_choice"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "multiple_choice" ? "text-orange-500" : "text-white"}`}>
                Multiple
              </p>
              <p className="text-xs text-zinc-500">Many options</p>
            </button>

            <button
              onClick={() => setBetType("over_under")}
              className={`p-4 rounded-xl border-2 transition-all ${
                betType === "over_under"
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${betType === "over_under" ? "text-orange-500" : "text-white"}`}>
                Over/Under
              </p>
              <p className="text-xs text-zinc-500">Set a line</p>
            </button>
          </div>

          <button
            onClick={() => {
              console.log("Moving to step 2");
              setCurrentStep(2);
            }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* ===== STEP 2: DESTINATION - THIS IS WHERE H2H SHOULD APPEAR ===== */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Who's this bet for?
          </h2>

          {/* Destination Selection - BOTH OPTIONS MUST SHOW (unless old interface) */}
          <div className="space-y-3 mb-6">
            {/* POST TO GROUP OPTION */}
            <button
              onClick={() => {
                console.log("Selected: group");
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

            {/* CHALLENGE FRIEND OPTION - H2H (only show in new interface) */}
            {!isOldInterface && (
              <button
                onClick={() => {
                  console.log("Selected: h2h");
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
            )}
          </div>

          {/* GROUP DROPDOWN - Shows when group selected */}
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
                    console.log("Selected group:", group?.name);
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

          {/* H2H FRIEND SELECTION - Shows when H2H selected */}
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
                        onClick={() => {
                          setSelectedFriend(friend);
                          console.log("Selected friend:", friend.displayName || friend.firstName);
                        }}
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

                {/* Odds Explanation */}
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
                  <div className="relative">
                    <select
                      value={h2hGroupSelection?.id || ""}
                      onChange={(e) => {
                        const group = groups.find(g => g.id === e.target.value);
                        setH2hGroupSelection(group);
                      }}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500"
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
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
            >
              Back
            </button>

            <button
              onClick={() => {
                console.log("Next button clicked, destination:", betDestination);
                if (betDestination === "group" && !selectedGroup) {
                  alert("Please select a group");
                  return;
                }
                if (betDestination === "h2h" && !selectedFriend) {
                  alert("Please select a friend");
                  return;
                }
                setCurrentStep(3);
              }}
              disabled={
                !betDestination ||
                (betDestination === "group" && !selectedGroup) ||
                (betDestination === "h2h" && !selectedFriend)
              }
              className={`flex-1 py-3 ${themeColor === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors`}
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

          {/* Multiple Choice Options */}
          {betType === "multiple_choice" && (
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
          {betType === "over_under" && (
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
