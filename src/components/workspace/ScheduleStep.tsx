import type { AuthUser } from '../../contexts/AuthContext';
import type { OnboardingData } from '../../pages/WorkspaceSetupPage';

interface ScheduleStepProps {
  user: AuthUser | null;
  onboardingData: OnboardingData | null;
  onBackToSite: () => void;
  onExplore: () => void;
}

export default function ScheduleStep({ user, onBackToSite, onExplore }: ScheduleStepProps) {
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div className="ws-modal">
      {/* Check icon */}
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-emerald-100">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17L4 12"/>
        </svg>
      </div>

      <h1 className="text-[24px] font-bold text-gray-900 leading-tight mb-3">
        {firstName ? `${firstName}, your workspace is almost ready` : 'Your workspace is almost ready'}
      </h1>

      <p className="text-[14px] text-gray-500 leading-relaxed mb-2">
        Our team will finalize the configuration and activate your environment.
      </p>
      <p className="text-[13px] text-gray-400 mb-8">
        A Nexus specialist will walk you through the setup so you can launch quickly.
      </p>

      {/* What to expect */}
      <div className="bg-indigo-50 rounded-xl p-4 mb-7 border border-indigo-100">
        <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider mb-2">What to expect</p>
        <ul className="space-y-1.5">
          {[
            '30-minute setup call with a Nexus specialist',
            'Live walkthrough of your dashboard',
            'Configuration tailored to your use case',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-[12px] text-indigo-800">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17L4 12"/>
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        onClick={() => window.open('https://calendly.com', '_blank')}
        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3.5 rounded-xl transition-all text-[14px] shadow-md shadow-indigo-500/25 mb-3"
      >
        Schedule your setup session
      </button>

      {/* Secondary links */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onExplore}
          className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          Explore Nexus
        </button>
        <span className="text-gray-200">|</span>
        <button
          onClick={onBackToSite}
          className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to website
        </button>
      </div>
    </div>
  );
}
