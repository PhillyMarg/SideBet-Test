"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Trophy, Users, Zap } from "lucide-react";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export default function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  onCreateGroup,
  onJoinGroup,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreateGroup = () => {
    onComplete();
    onClose();
    onCreateGroup();
  };

  const handleJoinGroup = () => {
    onComplete();
    onClose();
    onJoinGroup();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-center z-50 bg-black/60 p-4"
      onClick={handleSkip}
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
            Welcome to SideBet
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="text-orange-500 hover:text-orange-400 transition text-xs sm:text-sm font-medium"
            >
              Skip
            </button>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-orange-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-zinc-400 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
            Step {step} of 6
          </p>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-5 py-4 sm:py-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="text-5xl sm:text-6xl mb-4">🎲</div>
                  <h4 className="text-lg sm:text-xl font-semibold text-white">
                    Welcome to SideBet!
                  </h4>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Make friendly wagers with your friends - no real money involved. Just
                    bragging rights!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Groups Explained */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center mb-3 sm:mb-4">
                  <Users className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 mx-auto mb-3" />
                  <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    Everything Happens in Groups
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Create groups with friends, coworkers, or family. Each group has its
                    own bets and leaderboard.
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Set your own wager limits
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Track wins and losses together
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Multiple groups = different circles of friends
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Creating Bets */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center mb-3 sm:mb-4">
                  <Zap className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 mx-auto mb-3" />
                  <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    Three Ways to Bet
                  </h4>
                </div>

                <div className="w-full p-3 sm:p-4 rounded-lg border-2 border-zinc-700 bg-zinc-800">
                  <div className="font-semibold text-white text-sm sm:text-base mb-1">
                    Yes/No
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    &ldquo;Will it rain tomorrow?&rdquo;
                  </div>
                </div>

                <div className="w-full p-3 sm:p-4 rounded-lg border-2 border-zinc-700 bg-zinc-800">
                  <div className="font-semibold text-white text-sm sm:text-base mb-1">
                    Over/Under
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    &ldquo;Temperature over or under 75.5°F?&rdquo;
                  </div>
                </div>

                <div className="w-full p-3 sm:p-4 rounded-lg border-2 border-zinc-700 bg-zinc-800">
                  <div className="font-semibold text-white text-sm sm:text-base mb-1">
                    Closest Guess
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    &ldquo;How many points will LeBron score?&rdquo;
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: How Betting Works */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center mb-3 sm:mb-4">
                  <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 mx-auto mb-3" />
                  <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    Join &amp; Pick
                  </h4>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      See open bets in your groups
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Make your pick before the deadline
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Everyone bets the same amount
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Winner takes the pot!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Judging Results */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center mb-3 sm:mb-4">
                  <div className="text-5xl sm:text-6xl mb-4">⚖️</div>
                  <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    Who Wins?
                  </h4>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      The bet creator judges the outcome
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      Winners split the pot evenly
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-xs sm:text-sm text-gray-300">
                      All results are transparent
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Get Started */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                  <h4 className="text-lg sm:text-xl font-semibold text-white">
                    You&apos;re Ready!
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Create your first group or join an existing one. Start making bets
                    with friends!
                  </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3 pt-2 sm:pt-3">
                  <button
                    onClick={handleCreateGroup}
                    className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm sm:text-base font-semibold transition-colors"
                  >
                    Create a Group
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-zinc-700 hover:border-zinc-600 text-white rounded-md text-sm sm:text-base font-semibold transition-colors"
                  >
                    Join a Group
                  </button>
                </div>

                <p className="text-[10px] sm:text-xs text-center text-zinc-500 mt-3 sm:mt-4">
                  Need help? Check Settings for more info
                </p>
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

          {step < 6 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs sm:text-sm font-semibold transition-colors"
            >
              Next
              <ChevronRight size={16} className="sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-xs sm:text-sm font-semibold transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
