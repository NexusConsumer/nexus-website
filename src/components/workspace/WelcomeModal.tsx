interface WelcomeModalProps {
  onStart: () => void;
  onBack: () => void;
}

export default function WelcomeModal({ onStart, onBack }: WelcomeModalProps) {
  return (
    <div className="ws-modal">
      {/* Nexus icon */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="text-[15px] font-bold text-gray-900 tracking-tight">Nexus</span>
      </div>

      <h1 className="text-[26px] font-bold text-gray-900 mb-3 leading-tight">
        Welcome to Nexus
      </h1>

      <p className="text-[14px] text-gray-500 leading-relaxed mb-2">
        We're setting up your workspace. To configure the environment properly we need a few quick details about your organization.
      </p>
      <p className="text-[13px] text-gray-400 mb-9">
        This takes less than a minute.
      </p>

      <button
        onClick={onStart}
        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-all text-[14px] shadow-md shadow-indigo-500/25 mb-4"
      >
        Start setup
      </button>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to website
        </button>
      </div>
    </div>
  );
}
