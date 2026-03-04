import { useState } from 'react';
import type { OnboardingData } from '../../pages/WorkspaceSetupPage';

interface Step {
  key: keyof OnboardingData;
  title: string;
  subtitle?: string;
  multi: boolean;
  options: string[];
}

const STEPS: Step[] = [
  {
    key: 'organization_type',
    title: 'What best describes your organization?',
    multi: false,
    options: [
      'Nonprofit / Community',
      'Company',
      'Employee organization',
      'Municipality',
      'Other',
    ],
  },
  {
    key: 'use_case',
    title: 'What are you looking to launch with Nexus?',
    subtitle: 'Select all that apply',
    multi: true,
    options: [
      'Benefits club',
      'Digital wallet',
      'Voucher program',
      'Employee gifts / Holiday gifts for employees',
      'Loyalty program',
      'Prepaid / branded card',
      'Payment processing for my business',
      'Not sure yet',
    ],
  },
  {
    key: 'community_size',
    title: 'How large is your community?',
    multi: false,
    options: ['Under 500', '500 – 5,000', '5,000 – 50,000', '50,000+'],
  },
  {
    key: 'timeline',
    title: 'When would you like to launch?',
    multi: false,
    options: ['Immediately', 'In the next few months', 'Just exploring'],
  },
];

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onBack: () => void;
}

export default function OnboardingWizard({ onComplete, onBack }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<keyof OnboardingData, string | string[]>>>({});

  const current = STEPS[step];
  const isMulti = current.multi;

  const getAnswer = (): string | string[] | undefined => answers[current.key];

  const isSelected = (option: string): boolean => {
    const ans = getAnswer();
    if (isMulti) return Array.isArray(ans) && ans.includes(option);
    return ans === option;
  };

  const toggle = (option: string) => {
    if (isMulti) {
      const prev = (answers[current.key] as string[] | undefined) ?? [];
      const next = prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option];
      setAnswers(a => ({ ...a, [current.key]: next }));
    } else {
      setAnswers(a => ({ ...a, [current.key]: option }));
    }
  };

  const canContinue = isMulti
    ? ((answers[current.key] as string[] | undefined) ?? []).length > 0
    : !!answers[current.key];

  const handleNext = () => {
    if (!canContinue) return;
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete({
        organization_type: (answers.organization_type as string) ?? '',
        use_case: (answers.use_case as string[]) ?? [],
        community_size: (answers.community_size as string) ?? '',
        timeline: (answers.timeline as string) ?? '',
      });
    }
  };

  const handleBack = () => {
    if (step === 0) onBack();
    else setStep(s => s - 1);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="ws-modal">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <span className="text-[12px] font-medium text-gray-400">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100 rounded-full mb-7 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="text-[19px] font-bold text-gray-900 leading-snug mb-1.5">
        {current.title}
      </h2>
      {current.subtitle && (
        <p className="text-[12px] text-gray-400 mb-4">{current.subtitle}</p>
      )}
      {!current.subtitle && <div className="mb-5" />}

      {/* Options */}
      <div className="space-y-2">
        {current.options.map(option => {
          const selected = isSelected(option);
          return (
            <button
              key={option}
              onClick={() => toggle(option)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox / radio indicator */}
                {isMulti ? (
                  <div
                    className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {selected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected ? 'border-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                )}
                <span>{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      <button
        onClick={handleNext}
        disabled={!canContinue}
        className={`w-full mt-7 font-semibold py-3 rounded-xl transition-all text-[14px] ${
          canContinue
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {step < STEPS.length - 1 ? 'Continue →' : 'Finish setup →'}
      </button>
    </div>
  );
}
