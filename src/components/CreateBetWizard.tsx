"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

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
    type: "YES_NO",
    title: "",
    description: "",
    groupId: "",
    wager: "",
    customWager: "",
    closingTime: "",
    customClosingTime: "",
    line: "",
  });

  const wagerOptions = [
    { label: "$1", value: "1" },
    { label: "$5", value: "5" },
    { label: "$10", value: "10" },
    { label: "$20", value: "20" },
    { label: "$50", value: "50" },
    { label: "Custom", value: "custom" },
  ];

  const closingOptions = [
    { label: "1 Min", value: "1" },
    { label: "5 Min", value: "5" },
    { label: "30 Min", value: "30" },
    { label: "1 Hour", value: "60" },
    { label: "24 Hours", value: "1440" },
    { label: "Custom", value: "custom" },
  ];

  const getClosingDate = () => {
    if (!betData.closingTime) return null;

    const now = new Date();
    if (betData.closingTime === "custom" && betData.customClosingTime) {
      return new Date(betData.customClosingTime);
    } else if (betData.closingTime !== "custom") {
      const minutes = parseInt(betData.closingTime);
      return new Date(now.getTime() + minutes * 60000);
    }
    return null;
  };

  const formatClosingDate = () => {
    const date = getClosingDate();
    if (!date) return "";

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleString("en-US", options);
  };

  const handleNext = () => {
    if (step === 1 && !betData.type) return;
    if (step === 2 && !betData.title.trim()) return;
    if (step === 2 && betData.type === "OVER_UNDER" && !betData.line) return;
    if (step === 3 && !betData.groupId) return;
    if (step === 4) {
      const finalWager =
        betData.wager === "custom" ? betData.customWager : betData.wager;
      if (!finalWager || parseFloat(finalWager) <= 0) return;
    }
    if (step === 5) {
      if (betData.closingTime === "custom") {
        if (!betData.customClosingTime) return;
      } else if (!betData.closingTime) {
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const finalWager =
      betData.wager === "custom" ? betData.customWager : betData.wager;

    let closingAt: Date;
    if (betData.closingTime === "custom") {
      closingAt = new Date(betData.customClosingTime);
    } else {
      const minutes = parseInt(betData.closingTime);
      closingAt = new Date(Date.now() + minutes * 60000);
    }

    const finalBetData = {
      type: betData.type,
      title: betData.title,
      description: betData.description,
      groupId: betData.groupId,
      wager: parseFloat(finalWager),
      closingAt: closingAt.toISOString(),
      line: betData.type === "OVER_UNDER" ? parseFloat(betData.line) : null,
    };

    await onCreateBet(finalBetData);
    onClose();
    setBetData({
      type: "YES_NO",
      title: "",
      description: "",
      groupId: "",
      wager: "",
      customWager: "",
      closingTime: "",
      customClosingTime: "",
      line: "",
    });
    setStep(1);
  };

  const getSelectedGroup = () => {
    return groups.find((g) => g.id === betData.groupId);
  };

  const getEstimatedPot = () => {
    const finalWager =
      betData.wager === "custom" ? betData.customWager : betData.wager;
    const wagerNum = parseFloat(finalWager) || 0;
    const group = getSelectedGroup();
    const memberCount = group?.memberIds?.length || 0;
    return wagerNum * memberCount;
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
          <h2 className="text-2xl font-bold text-white">Create New Bet</h2>
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
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-zinc-400 text-sm mt-2">Step {step} of 6</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Bet Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Choose Bet Type
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      type: "YES_NO",
                      label: "Yes/No",
                      desc: "Binary outcome bet",
                    },
                    {
                      type: "OVER_UNDER",
                      label: "Over/Under",
                      desc: "Bet on a number threshold",
                    },
                    {
                      type: "CLOSEST_GUESS",
                      label: "Closest Guess",
                      desc: "Guess a number or text answer",
                    },
                  ].map((option) => (
                    <button
                      key={option.type}
                      onClick={() =>
                        setBetData({ ...betData, type: option.type })
                      }
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        betData.type === option.type
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="font-semibold text-white">
                        {option.label}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Title & Description (+ Line for Over/Under) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Bet Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Bet Title *
                    </label>
                    <input
                      type="text"
                      value={betData.title}
                      onChange={(e) =>
                        setBetData({ ...betData, title: e.target.value })
                      }
                      placeholder={
                        betData.type === "CLOSEST_GUESS"
                          ? "e.g., What color will the car be?"
                          : "e.g., Will it rain tomorrow?"
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={betData.description}
                      onChange={(e) =>
                        setBetData({ ...betData, description: e.target.value })
                      }
                      placeholder="Add more context..."
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                  {betData.type === "OVER_UNDER" && (
                    <div>
                      <label className="block text-zinc-400 text-sm mb-2">
                        Over/Under Line *
                      </label>
                      <p className="text-zinc-500 text-xs mb-2">
                        Line will automatically be set to .5 (e.g., 50 becomes 50.5)
                      </p>
                      <input
                        type="number"
                        value={betData.line}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue && !inputValue.includes('.')) {
                            setBetData({ ...betData, line: inputValue + '.5' });
                          } else {
                            setBetData({ ...betData, line: inputValue });
                          }
                        }}
                        placeholder="e.g., 50"
                        step="0.5"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                  {betData.type === "CLOSEST_GUESS" && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                      <p className="text-sm text-zinc-300">
                        💡 <span className="font-semibold">Tip:</span> For Closest Guess bets, participants can submit either numbers or text. 
                        The creator will judge who was closest when the bet closes!
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Select Group */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Select Group
                </h3>
                
                {groups.length > 0 ? (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() =>
                          setBetData({ ...betData, groupId: group.id })
                        }
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          betData.groupId === group.id
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-white">
                          {group.name}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {group.memberIds?.length || 0} members
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">
                      You need to create a group first before creating a bet.
                    </p>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Close & Create Group
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Wager Amount */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Set Wager Amount
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {wagerOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setBetData({ ...betData, wager: option.value })
                      }
                      className={`p-4 rounded-xl border-2 transition-all font-semibold ${
                        betData.wager === option.value
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {betData.wager === "custom" && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Custom Amount ($)
                    </label>
                    <input
                      type="number"
                      value={betData.customWager}
                      onChange={(e) =>
                        setBetData({ ...betData, customWager: e.target.value })
                      }
                      placeholder="Enter amount"
                      min="0.01"
                      step="0.01"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Closing Time */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Set Deadline
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {closingOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setBetData({ ...betData, closingTime: option.value })
                      }
                      className={`p-4 rounded-xl border-2 transition-all font-semibold ${
                        betData.closingTime === option.value
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {betData.closingTime === "custom" && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Custom Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={betData.customClosingTime}
                      onChange={(e) =>
                        setBetData({
                          ...betData,
                          customClosingTime: e.target.value,
                        })
                      }
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 6: Summary */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Confirm Bet
                </h3>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="text-zinc-400 text-sm">Type</div>
                    <div className="text-white font-semibold">
                      {betData.type === "YES_NO"
                        ? "Yes/No"
                        : betData.type === "OVER_UNDER"
                        ? "Over/Under"
                        : "Closest Guess"}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Title</div>
                    <div className="text-white font-semibold">
                      {betData.title}
                    </div>
                  </div>
                  {betData.description && (
                    <div>
                      <div className="text-zinc-400 text-sm">Description</div>
                      <div className="text-white">{betData.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-zinc-400 text-sm">Group</div>
                    <div className="text-white font-semibold">
                      {getSelectedGroup()?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Wager per Person</div>
                    <div className="text-white font-semibold">
                      $
                      {betData.wager === "custom"
                        ? betData.customWager
                        : betData.wager}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Estimated Pot</div>
                    <div className="text-white font-semibold">
                      ${getEstimatedPot().toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm">Closes At</div>
                    <div className="text-white font-semibold">
                      {formatClosingDate()}
                    </div>
                  </div>
                  {betData.type === "OVER_UNDER" && (
                    <div>
                      <div className="text-zinc-400 text-sm">Line</div>
                      <div className="text-white font-semibold">
                        {betData.line}
                      </div>
                    </div>
                  )}
                  {betData.type === "CLOSEST_GUESS" && (
                    <div className="bg-zinc-800 rounded-lg p-3 mt-2">
                      <p className="text-xs text-zinc-400">
                        Note: Participants can submit numbers or text. You'll judge the winner when the bet closes.
                      </p>
                    </div>
                  )}
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

          {step < 6 ? (
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
              Create Bet
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}