"use client";

import { useState } from "react";
import { X } from "lucide-react";

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
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !betData.type) {
      alert("Please select a bet type");
      return;
    }
    if (step === 2 && !betData.groupId) {
      alert("Please select a group");
      return;
    }
    if (step === 3 && (!betData.title.trim() || !betData.wager || !betData.closingAt)) {
      alert("Please fill in all required fields");
      return;
    }
    if (step === 3 && betData.type === "OVER_UNDER" && !betData.line) {
      alert("Please set a line for Over/Under bets");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    await onCreateBet(betData);
    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 p-4"
      onClick={resetAndClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90%] max-w-[380px] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl transform transition-all duration-300 ease-out max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            Create Bet {step > 1 && `(${step}/4)`}
          </h3>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-5 py-4 sm:py-5">
          {/* Step 1: Bet Type */}
          {step === 1 && (
            <div className="space-y-2.5 sm:space-y-3">
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
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
            </div>
          )}

          {/* Step 2: Select Group */}
          {step === 2 && (
            <div className="space-y-2.5 sm:space-y-3">
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
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
                  <p className="text-gray-400 text-xs sm:text-sm mb-3">
                    You need to join or create a group first
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Bet Details */}
          {step === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm mb-1.5 sm:mb-2 text-gray-400">
                  Bet Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Will it rain tomorrow?"
                  value={betData.title}
                  onChange={(e) => setBetData({ ...betData, title: e.target.value })}
                  className="w-full bg-zinc-800 text-white p-2 sm:p-2.5 rounded-md text-xs sm:text-sm border border-zinc-700 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm mb-1.5 sm:mb-2 text-gray-400">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add more details..."
                  value={betData.description}
                  onChange={(e) =>
                    setBetData({ ...betData, description: e.target.value })
                  }
                  className="w-full bg-zinc-800 text-white p-2 sm:p-2.5 rounded-md text-xs sm:text-sm border border-zinc-700 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {betData.type === "OVER_UNDER" && (
                <div>
                  <label className="block text-xs sm:text-sm mb-1.5 sm:mb-2 text-gray-400">
                    Line (must end in .5) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 24.5"
                    value={betData.line}
                    onChange={(e) => setBetData({ ...betData, line: e.target.value })}
                    className="w-full bg-zinc-800 text-white p-2 sm:p-2.5 rounded-md text-xs sm:text-sm border border-zinc-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm mb-1.5 sm:mb-2 text-gray-400">
                  Wager Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={betData.wager}
                    onChange={(e) => setBetData({ ...betData, wager: e.target.value })}
                    className="w-full bg-zinc-800 text-white pl-7 pr-3 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm border border-zinc-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm mb-1.5 sm:mb-2 text-gray-400">
                  Betting Closes At *
                </label>
                <input
                  type="datetime-local"
                  value={betData.closingAt}
                  onChange={(e) =>
                    setBetData({ ...betData, closingAt: e.target.value })
                  }
                  className="w-full bg-zinc-800 text-white p-2 sm:p-2.5 rounded-md text-xs sm:text-sm border border-zinc-700 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                Review your bet details
              </p>

              <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">Type</div>
                  <div className="text-sm sm:text-base text-white font-medium">
                    {betData.type === "YES_NO"
                      ? "Yes/No"
                      : betData.type === "OVER_UNDER"
                      ? "Over/Under"
                      : "Closest Guess"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">Group</div>
                  <div className="text-sm sm:text-base text-white font-medium">
                    {groups.find((g) => g.id === betData.groupId)?.name}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">Title</div>
                  <div className="text-sm sm:text-base text-white font-medium">
                    {betData.title}
                  </div>
                </div>

                {betData.description && (
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-400 mb-1">
                      Description
                    </div>
                    <div className="text-xs sm:text-sm text-gray-300">
                      {betData.description}
                    </div>
                  </div>
                )}

                {betData.type === "OVER_UNDER" && betData.line && (
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-400 mb-1">Line</div>
                    <div className="text-sm sm:text-base text-white font-medium">
                      {betData.line}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">Wager</div>
                  <div className="text-sm sm:text-base text-orange-400 font-bold">
                    ${parseFloat(betData.wager || "0").toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1">
                    Closes At
                  </div>
                  <div className="text-xs sm:text-sm text-white">
                    {new Date(betData.closingAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-4 sm:px-5 py-3 sm:py-4 flex justify-between gap-2">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-zinc-700 text-gray-300 rounded-md hover:bg-zinc-800 transition"
            >
              Back
            </button>
          ) : (
            <button
              onClick={resetAndClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-zinc-700 text-gray-300 rounded-md hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !betData.type) ||
                (step === 2 && !betData.groupId) ||
                (step === 3 &&
                  (!betData.title.trim() || !betData.wager || !betData.closingAt))
              }
              className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition font-medium"
            >
              Create Bet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}