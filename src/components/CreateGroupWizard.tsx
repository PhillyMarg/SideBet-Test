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
      if (
        groupData.season_type === "custom" &&
        !groupData.season_end_date
      )
        return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
    onClose();
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
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-zinc-800"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Create New Group</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-zinc-400 text-sm mt-2">Step {step} of 5</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Group Name & Tagline */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Group Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      value={groupData.name}
                      onChange={(e) =>
                        setGroupData({ ...groupData, name: e.target.value })
                      }
                      placeholder="e.g., Friday Night Crew"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Tagline (Optional)
                    </label>
                    <input
                      type="text"
                      value={groupData.tagline}
                      onChange={(e) =>
                        setGroupData({ ...groupData, tagline: e.target.value })
                      }
                      placeholder="e.g., Where legends are made"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
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
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Wager Range
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Set the minimum and maximum bet amounts for this group.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
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
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
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
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {parseFloat(groupData.min_bet) >=
                    parseFloat(groupData.max_bet) &&
                    groupData.max_bet !== "" && (
                      <p className="text-xs text-red-500">
                        Minimum bet must be less than maximum bet.
                      </p>
                    )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Season Settings */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Season Settings
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupData.season_enabled}
                      onChange={(e) =>
                        setGroupData({
                          ...groupData,
                          season_enabled: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                      style={{
                        accentColor: '#f97316',
                      }}
                    />
                    Enable Season Tracking
                  </label>

                  {groupData.season_enabled && (
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-400 text-sm mb-3">
                          Season Duration *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
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
                                className={`py-3 px-4 rounded-lg text-sm font-medium border transition-all ${
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
                          <label className="block text-zinc-400 text-sm mb-2">
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
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupData.auto_renew}
                          onChange={(e) =>
                            setGroupData({
                              ...groupData,
                              auto_renew: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                          style={{
                            accentColor: '#f97316',
                          }}
                        />
                        Auto-Renew Season
                      </label>

                      <p className="text-xs text-zinc-500 mt-2">
                        A "season" tracks activity for a set timeframe.
                        Everything resets to $0 at the end of the season. At the
                        start of a new season, every member begins again at $0.
                      </p>
                    </div>
                  )}

                  {!groupData.season_enabled && (
                    <p className="text-sm text-zinc-500">
                      Season tracking allows you to reset balances periodically.
                      You can enable this later if needed.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Invite Settings */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Invite Members
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Share these codes with friends to invite them to your group.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Join Link
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm truncate">
                        {groupData.joinLink || "Generating..."}
                      </div>
                      <button
                        onClick={() => {
                          if (groupData.joinLink) {
                            navigator.clipboard.writeText(groupData.joinLink);
                            alert("Join link copied!");
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Access Code
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm tracking-widest font-mono">
                        {groupData.accessCode || "Generating..."}
                      </div>
                      <button
                        onClick={() => {
                          if (groupData.accessCode) {
                            navigator.clipboard.writeText(groupData.accessCode);
                            alert("Access code copied!");
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                      >
                        Copy
                      </button>
                    </div>
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
                <h3 className="text-xl font-bold text-white mb-4">
                  Review & Confirm
                </h3>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="text-zinc-400 text-sm">Group Name</div>
                    <div className="text-white font-semibold">
                      {groupData.name}
                    </div>
                  </div>
                  {groupData.tagline && (
                    <div>
                      <div className="text-zinc-400 text-sm">Tagline</div>
                      <div className="text-white">{groupData.tagline}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-zinc-400 text-sm">Wager Range</div>
                    <div className="text-white font-semibold">
                      ${groupData.min_bet} - ${groupData.max_bet}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Season Tracking</div>
                    <div className="text-white font-semibold">
                      {groupData.season_enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  {groupData.season_enabled && (
                    <>
                      <div>
                        <div className="text-zinc-400 text-sm">Season Type</div>
                        <div className="text-white font-semibold">
                          {groupData.season_type.charAt(0).toUpperCase() +
                            groupData.season_type.slice(1)}
                        </div>
                      </div>
                      {groupData.season_end_date && (
                        <div>
                          <div className="text-zinc-400 text-sm">End Date</div>
                          <div className="text-white font-semibold">
                            {groupData.season_end_date}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-zinc-400 text-sm">Auto-Renew</div>
                        <div className="text-white font-semibold">
                          {groupData.auto_renew ? "Yes" : "No"}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <div className="text-zinc-400 text-sm">Access Code</div>
                    <div className="text-white font-semibold font-mono tracking-widest">
                      {groupData.accessCode}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
            >
              <Check size={20} />
              Create Group
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}