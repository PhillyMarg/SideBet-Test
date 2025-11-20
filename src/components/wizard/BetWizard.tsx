"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Step1ChooseType } from './steps/Step1ChooseType';
import { Step2SelectTarget } from './steps/Step2SelectTarget';
import { Step3BetType } from './steps/Step3BetType';
import { Step4BetDetails } from './steps/Step4BetDetails';
import { Step5FinalDetails } from './steps/Step5FinalDetails';
import { Step6Confirmation } from './steps/Step6Confirmation';

export type WizardTheme = 'group' | 'friend';
export type BetType = 'YES_NO' | 'OVER_UNDER' | 'CLOSEST_GUESS';

export interface WizardData {
  theme: WizardTheme;
  targetId?: string;  // group ID or friend ID
  targetName?: string;
  betType?: BetType;
  title?: string;
  description?: string;
  line?: number;  // For Over/Under
  wagerAmount?: number;
  closingDate?: Date;
}

interface BetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
  userId?: string;
}

export function BetWizard({ isOpen, onClose, onComplete, userId }: BetWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({ theme: 'group' });

  if (!isOpen) return null;

  const themeColor = wizardData.theme === 'group' ? '#FF6B35' : '#A855F7';
  const totalSteps = 6;

  const handleNext = (stepData: Partial<WizardData>) => {
    const newData = { ...wizardData, ...stepData };
    setWizardData(newData);

    if (currentStep === 6) {
      // Final step - create bet
      onComplete(newData);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // Back from step 1 = close wizard
      onClose();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    // Close and reset progress
    setCurrentStep(1);
    setWizardData({ theme: 'group' });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/80 z-[60]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="bg-[#18181B] rounded-lg w-full max-w-[393px] relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* Progress Bar */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex justify-between items-center mb-3">
              <span
                className="text-xs font-montserrat font-semibold"
                style={{ color: themeColor }}
              >
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: i < currentStep ? themeColor : '#27272A'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="px-6 pb-6">
            {currentStep === 1 && (
              <Step1ChooseType
                onNext={handleNext}
                initialTheme={wizardData.theme}
              />
            )}
            {currentStep === 2 && (
              <Step2SelectTarget
                theme={wizardData.theme}
                onNext={handleNext}
                onBack={handleBack}
                userId={userId}
              />
            )}
            {currentStep === 3 && (
              <Step3BetType
                theme={wizardData.theme}
                selectedTarget={wizardData.targetName}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <Step4BetDetails
                theme={wizardData.theme}
                betType={wizardData.betType!}
                selectedTarget={wizardData.targetName}
                initialTitle={wizardData.title}
                initialDescription={wizardData.description}
                initialLine={wizardData.line}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <Step5FinalDetails
                theme={wizardData.theme}
                selectedTarget={wizardData.targetName}
                initialWager={wizardData.wagerAmount}
                initialDate={wizardData.closingDate}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 6 && (
              <Step6Confirmation
                wizardData={wizardData}
                onConfirm={handleNext}
                onBack={handleBack}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BetWizard;
