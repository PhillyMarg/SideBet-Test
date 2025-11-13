"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface CreateGroupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: any) => Promise<void>;
}

export default function CreateGroupWizard({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupWizardProps) {
  const [step, setStep] = useState(1);
  const [groupData, setGroupData] = useState({
    name: "",
    tagline: "",
    min_bet: "",
    max_bet: "",
    season_enabled: false,
    season_type: "",
    season_end_date: "",
    auto_renew: false,
    inviteType: "link",
    joinLink: "",
    accessCode: "",
  });

  // Generate codes when wizard opens
  useEffect(() => {
    if (isOpen && (!groupData.joinLink || !groupData.accessCode)) {
      setGroupData((prev) => ({
        ...prev,
        joinLink:
          prev.joinLink ||
          `https://sidebet.app/join/${Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()}`,
        accessCode:
          prev.accessCode ||
          Math.random().toString(36).substring(2, 7).toUpperCase(),
      }));
    }
  }, [isOpen]);

  // Utility function for season end date calculation
  const calcEndDate = (type: string) => {
    const now = new Date();
    const ms: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 31 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
    };
    return ms[type]
      ? new Date(now.getTime() + ms[type]).toISOString().split("T")[0]
      : "";
  };

  const handleNext = () => {
    if (step === 1 && !groupData.name.trim()) return;
    if (step === 2) {
      if (!groupData.min_bet || !groupData.max_bet) return;
      if (parseFloat(groupData.min_bet) >= parseFloat(groupData.max_bet)) return;
    }
    if (step === 3 && groupData.season_enabled) {
      if (!groupData.season_type) return;
      if (groupData.season_type === "custom" && !groupData.season_end_date) return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetAndClose = () => {
    setStep(1);
    setGroupData({
      name: "",
      tagline: "",
      min_bet: "",
      max_bet: "",
      season_enabled: false,
      season_type: "",
      season_end_date: "",
      auto_renew: false,
      inviteType: "link",
      joinLink: "",
      accessCode: "",
    });
    onClose();
  };

  const handleSubmit = async () => {
    const finalGroupData = {
      name: groupData.name,
      tagline: groupData.tagline || "",
      min_bet: parseFloat(groupData.min_bet) || 0,
      max_bet: parseFloat(groupData.max_bet) || 0,
      season_enabled: groupData.season_enabled,
      season_type: groupData.season_type || "none",
      season_end_date: groupData.season_end_date || null,
      auto_renew: groupData.auto_renew,
      inviteType: groupData.inviteType,
      joinLink: groupData.joinLink,
      accessCode: groupData.accessCode,
    };

    await onCreateGroup(finalGroupData);
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
            Create Group {step > 1 && `(${step}/5)`}
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
                  s <= step ? "bg-orange-500" : "bg-zinc-800"
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
            {/* Step 1: Group Name & Tagline */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
                  Group Details
                </h4>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupData.name}
                    onChange={(e) =>
                      setGroupData({ ...groupData, name: e.target.value })
                    }
                    placeholder="e.g., Friday Night Crew"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={groupData.tagline}
                    onChange={(e) =>
                      setGroupData({ ...groupData, tagline: e.target.value })
                    }
                    placeholder="e.g., Where legends are made"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Wager Range */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2 sm:mb-3">
                  Wager Range
                </h4>
                <p className="text-zinc-400 text-[10px] sm:text-xs mb-3 sm:mb-4">
                  Set the minimum and maximum bet amounts for this group.
                </p>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Minimum Bet ($) *
                  </label>
                  <input
                    type="number"
                    value={groupData.min_bet}
                    onChange={(e) =>
                      setGroupData({ ...groupData, min_bet: e.target.value })
                    }
                    placeholder="e.g., 1"
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Maximum Bet ($) *
                  </label>
                  <input
                    type="number"
                    value={groupData.max_bet}
                    onChange={(e) =>
                      setGroupData({ ...groupData, max_bet: e.target.value })
                    }
                    placeholder="e.g., 50"
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                {parseFloat(groupData.min_bet) >= parseFloat(groupData.max_bet) &&
                  groupData.max_bet !== "" && (
                    <p className="text-[10px] sm:text-xs text-red-500">
                      Minimum bet must be less than maximum bet.
                    </p>
                  )}
              </motion.div>
            )}

            {/* Step 3: Season Settings */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2 sm:mb-3">
                  Season Settings
                </h4>
                <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupData.season_enabled}
                    onChange={(e) =>
                      setGroupData({
                        ...groupData,
                        season_enabled: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-orange-500"
                  />
                  Enable Season Tracking
                </label>

                {groupData.season_enabled && (
                  <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-zinc-400 text-xs sm:text-sm mb-2 sm:mb-3">
                        Season Duration *
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {["daily", "weekly", "monthly", "quarterly", "custom", "never"].map(
                          (opt) => (
                            <button
                              key={opt}
                              onClick={() =>
                                setGroupData({
                                  ...groupData,
                                  season_type: opt,
                                  season_end_date:
                                    opt === "custom"
                                      ? groupData.season_end_date
                                      : calcEndDate(opt),
                                })
                              }
                              className={`py-2 sm:py-2.5 px-2 sm:px-3 rounded-md text-[10px] sm:text-xs font-medium border transition-all ${
                                groupData.season_type === opt
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "border-zinc-700 text-gray-300 hover:bg-zinc-700"
                              }`}
                            >
                              {opt === "never"
                                ? "Never End"
                                : opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {groupData.season_type === "custom" && (
                      <div>
                        <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                          Custom End Date *
                        </label>
                        <input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          value={groupData.season_end_date}
                          onChange={(e) =>
                            setGroupData({
                              ...groupData,
                              season_end_date: e.target.value,
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupData.auto_renew}
                        onChange={(e) =>
                          setGroupData({
                            ...groupData,
                            auto_renew: e.target.checked,
                          })
                        }
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-orange-500"
                      />
                      Auto-Renew Season
                    </label>

                    <p className="text-[10px] sm:text-xs text-zinc-500">
                      A "season" tracks activity for a set timeframe. Everything resets
                      to $0 at the end of the season. At the start of a new season,
                      every member begins again at $0.
                    </p>
                  </div>
                )}

                {!groupData.season_enabled && (
                  <p className="text-[10px] sm:text-xs text-zinc-500">
                    Season tracking allows you to reset balances periodically. You can
                    enable this later if needed.
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 4: Invite Settings */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2 sm:mb-3">
                  Invite Members
                </h4>
                <p className="text-zinc-400 text-[10px] sm:text-xs mb-3 sm:mb-4">
                  Share these codes with friends to invite them to your group.
                </p>
                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Join Link
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-3 py-2 sm:py-2.5 text-white text-[10px] sm:text-xs truncate">
                      {groupData.joinLink || "Generating..."}
                    </div>
                    <button
                      onClick={() => {
                        if (groupData.joinLink) {
                          navigator.clipboard.writeText(groupData.joinLink);
                          alert("Join link copied!");
                        }
                      }}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[10px] sm:text-xs font-semibold transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs sm:text-sm mb-1.5 sm:mb-2">
                    Access Code
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 sm:px-3 py-2 sm:py-2.5 text-white text-[10px] sm:text-xs tracking-widest font-mono">
                      {groupData.accessCode || "Generating..."}
                    </div>
                    <button
                      onClick={() => {
                        if (groupData.accessCode) {
                          navigator.clipboard.writeText(groupData.accessCode);
                          alert("Access code copied!");
                        }
                      }}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[10px] sm:text-xs font-semibold transition-colors"
                    >
                      Copy
                    </button>
                  </div>
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
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                      Group Name
                    </div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {groupData.name}
                    </div>
                  </div>
                  {groupData.tagline && (
                    <div>
                      <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                        Tagline
                      </div>
                      <div className="text-white text-xs sm:text-sm">
                        {groupData.tagline}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                      Wager Range
                    </div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      ${groupData.min_bet} - ${groupData.max_bet}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                      Season Tracking
                    </div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {groupData.season_enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  {groupData.season_enabled && (
                    <>
                      <div>
                        <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                          Season Type
                        </div>
                        <div className="text-white text-xs sm:text-sm font-semibold">
                          {groupData.season_type.charAt(0).toUpperCase() +
                            groupData.season_type.slice(1)}
                        </div>
                      </div>
                      {groupData.season_end_date && (
                        <div>
                          <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                            End Date
                          </div>
                          <div className="text-white text-xs sm:text-sm font-semibold">
                            {new Date(groupData.season_end_date).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                          Auto-Renew
                        </div>
                        <div className="text-white text-xs sm:text-sm font-semibold">
                          {groupData.auto_renew ? "Yes" : "No"}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <div className="text-zinc-400 text-[10px] sm:text-xs mb-1">
                      Access Code
                    </div>
                    <div className="text-white text-xs sm:text-sm font-semibold font-mono tracking-widest">
                      {groupData.accessCode}
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
                (step === 1 && !groupData.name.trim()) ||
                (step === 2 &&
                  (!groupData.min_bet ||
                    !groupData.max_bet ||
                    parseFloat(groupData.min_bet) >= parseFloat(groupData.max_bet)))
              }
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} className="sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs sm:text-sm font-semibold transition-colors"
            >
              <Check size={16} className="sm:w-5 sm:h-5" />
              Create Group
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}