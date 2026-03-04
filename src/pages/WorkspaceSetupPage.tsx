import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardMock from '../components/workspace/DashboardMock';
import WelcomeModal from '../components/workspace/WelcomeModal';
import OnboardingWizard from '../components/workspace/OnboardingWizard';
import SetupAnimation from '../components/workspace/SetupAnimation';
import ScheduleStep from '../components/workspace/ScheduleStep';

type Phase = 'welcome' | 'wizard' | 'animation' | 'schedule';

export interface OnboardingData {
  organization_type: string;
  use_case: string[];
  community_size: string;
  timeline: string;
}

export default function WorkspaceSetupPage() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleWizardComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setPhase('animation');
  };

  // Dashboard blur: strong blur+dim during modal phases, lighter on schedule
  const dashFilter =
    phase === 'schedule'
      ? 'blur(1px) brightness(0.55)'
      : 'blur(3px) brightness(0.38)';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080C14]">

      {/* ── Blurred dashboard background ──────────────────────── */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{ filter: dashFilter }}
      >
        <DashboardMock />
      </div>

      {/* ── Modal overlay ─────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">

        {phase === 'welcome' && (
          <WelcomeModal
            onStart={() => setPhase('wizard')}
            onBack={() => navigate('/')}
          />
        )}

        {phase === 'wizard' && (
          <OnboardingWizard
            onComplete={handleWizardComplete}
            onBack={() => setPhase('welcome')}
          />
        )}

        {phase === 'animation' && (
          <SetupAnimation onComplete={() => setPhase('schedule')} />
        )}

        {phase === 'schedule' && (
          <ScheduleStep
            user={user}
            onboardingData={onboardingData}
            onBackToSite={() => navigate('/')}
            onExplore={() => navigate('/')}
          />
        )}

      </div>

      {/* ── Shared modal card styles ───────────────────────────── */}
      <style>{`
        .ws-modal {
          background: #ffffff;
          border-radius: 20px;
          padding: 2rem;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 32px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
          animation: wsIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes wsIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
