"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Users, Swords } from "lucide-react";
import { db, auth } from "../lib/firebase/client";
import { collection, query, where, getDocs, or } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface CreateBetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  groups: any[];
  onCreateBet: (betData: any) => Promise<void>;
}

export default function CreateBetWizard({
  isOpen,
  onClose,
  groups,
  onCreateBet,
}: CreateBetWizardProps) {
  const [step, setStep] = useState(1);
  const [betData, setBetData] = useState({
    type: "",
    groupId: "",
    title: "",
    description: "",
    wager: "",
    line: "",
    closingAt: "",
  });

  // H2H specific state
  const [betDestination, setBetDestination] = useState<"group" | "h2h">("group");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [h2hOdds, setH2hOdds] = useState({ challenger: 1, challengee: 1 });
  const [h2hInGroup, setH2hInGroup] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Fetch friends for H2H
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch friends
        const friendshipsQuery = query(
          collection(db, "friendships"),
          or(
            where("user1Id", "==", currentUser.uid),
            where("user2Id", "==", currentUser.uid)
          )
        );

        const friendshipsSnap = await getDocs(friendshipsQuery);
        const friendshipDocs = friendshipsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(f => f.status === "accepted");

        const friendIds = friendshipDocs.map(f =>
          f.user1Id === currentUser.uid ? f.user2Id : f.user1Id
        );

        // Fetch friend user data
        const friendsData = await Promise.all(
          friendIds.map(async (id) => {
            const userDocSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", id)));
            if (!userDocSnap.empty) {
              const doc = userDocSnap.docs[0];
              return { uid: id, ...doc.data() };
            }
            return null;
          })
        );

        setFriends(friendsData.filter(f => f !== null));
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for query params (when coming from friends page)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isH2H = params.get("h2h") === "true";
      const friendId = params.get("friendId");

      if (isH2H) {
        setBetDestination("h2h");

        if (friendId) {
          const friend = friends.find(f => f.uid === friendId);
          if (friend) {
            setSelectedFriend(friend);
          }
        }
      }
    }
  }, [friends]);

  const resetAndClose = () => {
    setStep(1);
    setBetData({
      type: "",
      groupId: "",
      title: "",
      description: "",
      wager: "",
      line: "",
      closingAt: "",
    });
    setBetDestination("group");
    setSelectedFriend(null);
    setH2hOdds({ challenger: 1, challengee: 1 });
    setH2hInGroup(false);
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !betData.type) {
      alert("Please select a bet type");
      return;
    }
    // Step 2: Destination selection (no validation needed, default is "group")
    if (step === 3 && betDestination === "group" && !betData.groupId) {
      alert("Please select a group");
      return;
    }
    if (step === 3 && betDestination === "h2h" && !selectedFriend) {
      alert("Please select a friend to challenge");
      return;
    }
    if (step === 4 && (!betData.title.trim() || !betData.wager || !betData.closingAt)) {
      alert("Please fill in all required fields");
      return;
    }
    if (step === 4 && betData.type === "OVER_UNDER" && !betData.line) {
      alert("Please set a line for Over/Under bets");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (betDestination === "h2h") {
      // Create H2H bet with additional fields
      const h2hBetData = {
        ...betData,
        isH2H: true,
        challengerId: user.uid,
        challengeeId: selectedFriend?.uid,
        challengerName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        challengeeName: selectedFriend?.displayName || `${selectedFriend?.firstName || ''} ${selectedFriend?.lastName || ''}`.trim(),
        h2hOdds: h2hOdds,
        h2hStatus: "pending",
        betAmount: parseFloat(betData.wager),
        groupId: h2hInGroup ? betData.groupId : null,
      };
      await onCreateBet(h2hBetData);
    } else {
      await onCreateBet(betData);
    }
    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 p-4"
      onClick={resetAndClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between z-10">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            Create Bet {step > 1 && `(${step}/5)`}
          </h3>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? (betDestination === "h2h" ? "bg-purple-500" : "bg-orange-500") : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-zinc-400 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
            Step {step} of 5
          </p>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-5 py-4 sm:py-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Bet Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
                  Bet Type Selection
                </h4>
                <p className="text-zinc-400 text-[10px] sm:text-xs mb-3 sm:mb-4">
                  Choose the type of bet you want to create
                </p>

              <button
                onClick={() => setBetData({ ...betData, type: "YES_NO" })}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition ${
                  betData.type === "YES_NO"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="font-semibold text-white text-sm sm:text-base mb-1">
                  Yes/No
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Simple binary bet with two outcomes
                </div>
              </button>

              <button
                onClick={() => setBetData({ ...betData, type: "OVER_UNDER" })}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition ${
                  betData.type === "OVER_UNDER"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="font-semibold text-white text-sm sm:text-base mb-1">
                  Over/Under
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Bet on whether a value is over or under a line
                </div>
              </button>

              <button
                onClick={() => setBetData({ ...betData, type: "CLOSEST_GUESS" })}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition ${
                  betData.type === "CLOSEST_GUESS"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="font-semibold text-white text-sm sm:text-base mb-1">
                  Closest Guess
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Winner is whoever guesses closest to the actual value
                </div>
              </button>
              </motion.div>
            )}

            {/* Step 2: Choose Destination */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
                  Where do you want to post this bet?
                </h4>

                <button
                  onClick={() => setBetDestination("group")}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    betDestination === "group"
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className={`w-5 h-5 ${betDestination === "group" ? "text-orange-500" : "text-zinc-400"}`} />
                    <div className="text-left">
                      <p className={`font-semibold text-sm sm:text-base ${betDestination === "group" ? "text-orange-500" : "text-white"}`}>
                        Post to Group
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        Share with your group members
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setBetDestination("h2h")}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    betDestination === "h2h"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Swords className={`w-5 h-5 ${betDestination === "h2h" ? "text-purple-500" : "text-zinc-400"}`} />
                    <div className="text-left">
                      <p className={`font-semibold text-sm sm:text-base ${betDestination === "h2h" ? "text-purple-500" : "text-white"}`}>
                        Challenge Friend to H2H
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        One-on-one bet with a friend
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Step 3: Select Group or Friend */}
            {step === 3 && betDestination === "group" && (
              <motion.div
                key="step3-group"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2 sm:mb-3">
                  Select Group
                </h4>
                <p className="text-zinc-400 text-[10px] sm:text-xs mb-3 sm:mb-4">
                  Which group is this bet for?
                </p>

              {groups.length > 0 ? (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setBetData({ ...betData, groupId: group.id })}
                    className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition ${
                      betData.groupId === group.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="font-semibold text-white text-sm sm:text-base mb-1">
                      {group.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      {group.memberIds?.length || 0} members
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-400 text-xs sm:text-sm mb-3">
                    You need to join or create a group first
                  </p>
                </div>
              )}
              </motion.div>
            )}

            {/* Step 3: H2H Friend & Odds Selection */}
            {step === 3 && betDestination === "h2h" && (
              <motion.div
                key="step3-h2h"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-5"
              >
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
                    Choose Your Opponent
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {friends.length > 0 ? (
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
                    ) : (
                      <p className="text-zinc-400 text-sm text-center py-4">
                        No friends yet. Add friends to challenge them!
                      </p>
                    )}
                  </div>
                </div>

                {/* Odds Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Set Odds
                  </label>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { challenger: 1, challengee: 1, label: "1:1", desc: "Even" },
                      { challenger: 2, challengee: 1, label: "2:1", desc: "You favor" },
                      { challenger: 1, challengee: 2, label: "1:2", desc: "They favor" },
                      { challenger: 3, challengee: 1, label: "3:1", desc: "Heavy favor" },
                      { challenger: 4, challengee: 1, label: "4:1", desc: "Long odds" },
                      { challenger: 1, challengee: 4, label: "1:4", desc: "Underdog" },
                    ].map((odd) => (
                      <button
                        key={`${odd.challenger}-${odd.challengee}`}
                        onClick={() => setH2hOdds({ challenger: odd.challenger, challengee: odd.challengee })}
                        className={`p-3 rounded-lg border transition-all ${
                          h2hOdds.challenger === odd.challenger && h2hOdds.challengee === odd.challengee
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <p className="text-white text-sm font-semibold">{odd.label}</p>
                        <p className="text-zinc-500 text-xs">{odd.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-400">
                      {h2hOdds.challenger === h2hOdds.challengee ? (
                        <>Even odds: Both risk ${betData.wager || "X"} to win ${betData.wager || "X"}</>
                      ) : h2hOdds.challenger > h2hOdds.challengee ? (
                        <>You risk ${(parseFloat(betData.wager || "0") * h2hOdds.challenger).toFixed(2)} to win ${(parseFloat(betData.wager || "0") * h2hOdds.challengee).toFixed(2)}</>
                      ) : (
                        <>They risk ${(parseFloat(betData.wager || "0") * h2hOdds.challengee).toFixed(2)} to win ${(parseFloat(betData.wager || "0") * h2hOdds.challenger).toFixed(2)}</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Optional: Post to Group */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
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
                    <div className="space-y-2 mt-3">
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => setBetData({ ...betData, groupId: group.id })}
                          className={`w-full p-3 rounded-lg border transition-all ${
                            betData.groupId === group.id
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                          }`}
                        >
                          <span className="text-white text-sm">{group.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Bet Details */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2 sm:mb-3">
                  Bet Details
                </h4>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Bet Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Will it rain tomorrow?"
                    value={betData.title}
                    onChange={(e) => setBetData({ ...betData, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add more details..."
                    value={betData.description}
                    onChange={(e) =>
                      setBetData({ ...betData, description: e.target.value })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {betData.type === "OVER_UNDER" && (
                  <div>
                    <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                      Line (must end in .5) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g., 24.5"
                      value={betData.line}
                      onChange={(e) => setBetData({ ...betData, line: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Wager Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs sm:text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="10.00"
                      value={betData.wager}
                      onChange={(e) => setBetData({ ...betData, wager: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-7 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Betting Closes At *
                  </label>
                  <input
                    type="datetime-local"
                    value={betData.closingAt}
                    onChange={(e) =>
                      setBetData({ ...betData, closingAt: e.target.value })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 5: Review & Confirm */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
                  Review & Confirm
                </h4>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">Type</div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {betData.type === "YES_NO"
                        ? "Yes/No"
                        : betData.type === "OVER_UNDER"
                        ? "Over/Under"
                        : "Closest Guess"}
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">Group</div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {groups.find((g) => g.id === betData.groupId)?.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">Title</div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {betData.title}
                    </div>
                  </div>

                  {betData.description && (
                    <div>
                      <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                        Description
                      </div>
                      <div className="text-white text-xs sm:text-sm">
                        {betData.description}
                      </div>
                    </div>
                  )}

                  {betData.type === "OVER_UNDER" && betData.line && (
                    <div>
                      <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">Line</div>
                      <div className="text-white text-xs sm:text-sm font-semibold">
                        {betData.line}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">Wager</div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      ${parseFloat(betData.wager || "0").toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                      Closes At
                    </div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {new Date(betData.closingAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between z-10">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !betData.type) ||
                (step === 3 && betDestination === "group" && !betData.groupId) ||
                (step === 3 && betDestination === "h2h" && !selectedFriend) ||
                (step === 4 && (!betData.title.trim() || !betData.wager || !betData.closingAt))
              }
              className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 ${
                betDestination === "h2h" ? "bg-purple-500 hover:bg-purple-600" : "bg-orange-500 hover:bg-orange-600"
              } text-white rounded-md text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Next
              <ChevronRight size={16} className="sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 ${
                betDestination === "h2h" ? "bg-purple-500 hover:bg-purple-600" : "bg-orange-500 hover:bg-orange-600"
              } text-white rounded-md text-xs sm:text-sm font-semibold transition-colors`}
            >
              <Check size={16} className="sm:w-5 sm:h-5" />
              {betDestination === "h2h" ? "Send Challenge" : "Create Bet"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}