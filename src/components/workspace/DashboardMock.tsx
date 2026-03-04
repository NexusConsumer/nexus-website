import whiteWideLogo from '../../assets/logos/nexus-white-wide-logo.png';

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  {
    section: 'MAIN',
    items: [
      {
        label: 'Overview', active: true,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      },
      {
        label: 'Payments', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      },
      {
        label: 'Cards & Wallets', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H4v4m16 0v4H4v-4m16 0H4"/><rect x="4" y="8" width="16" height="8" rx="1"/></svg>,
      },
      {
        label: 'Benefits & Loyalty', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      },
    ],
  },
  {
    section: 'ANALYTICS',
    items: [
      {
        label: 'Reports', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      },
      {
        label: 'Analytics', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      },
      {
        label: 'Customers', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
      },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      {
        label: 'Developers', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
      },
      {
        label: 'Settings', active: false,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      },
    ],
  },
];

const STATS = [
  { label: 'Total Revenue', value: '$124,520', change: '+12.4%', sub: 'vs last month', color: '#818CF8' },
  { label: 'Members', value: '5,420', change: '+15.7%', sub: 'vs last month', color: '#34D399' },
  { label: 'Active Cards', value: '1,264', change: '+23.1%', sub: 'vs last month', color: '#F472B6' },
  { label: 'Transactions', value: '2,847', change: '+8.3%', sub: 'vs last month', color: '#60A5FA' },
];

const BREAKDOWN = [
  { label: 'Payments', pct: 42, color: '#6366F1' },
  { label: 'Vouchers', pct: 28, color: '#8B5CF6' },
  { label: 'Gift Cards', pct: 18, color: '#EC4899' },
  { label: 'Transfers', pct: 12, color: '#06B6D4' },
];

// Shimmer div shorthand
function Sk({ w, h, className = '' }: { w: string; h: string; className?: string }) {
  return <div className={`rounded shimmer-dk ${className}`} style={{ width: w, height: h }} />;
}

// Mini bar chart using SVG
function BarChart() {
  const bars = [45, 62, 38, 75, 58, 88, 71, 65, 90, 55, 78, 95];
  const max = 95;
  return (
    <svg viewBox="0 0 240 90" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>
      {bars.map((v, i) => {
        const x = (i / bars.length) * 240 + 4;
        const barH = (v / max) * 70;
        return (
          <rect
            key={i}
            x={x}
            y={90 - barH - 5}
            width={14}
            height={barH}
            rx={3}
            fill="url(#barGrad)"
            opacity={0.85}
          />
        );
      })}
      {/* Trend line */}
      <polyline
        points={bars.map((v, i) => `${(i / bars.length) * 240 + 11},${90 - (v / max) * 70 - 8}`).join(' ')}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardMock() {
  return (
    <div className="absolute inset-0 flex overflow-hidden select-none pointer-events-none font-sans">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 bg-[#080C14] border-r border-[#1A2035] flex flex-col">

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[#1A2035] gap-2">
          <img src={whiteWideLogo} alt="Nexus" className="h-5 w-auto brightness-110" />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-hidden">
          {NAV.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="text-[9px] font-semibold text-[#374151] tracking-widest px-3 mb-1">{group.section}</p>
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] mb-0.5 ${
                    item.active
                      ? 'bg-[#6366F1]/15 text-[#818CF8]'
                      : 'text-[#4B5563]'
                  }`}
                >
                  <span className={item.active ? 'text-[#818CF8]' : 'text-[#374151]'}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Org section */}
        <div className="p-3 border-t border-[#1A2035]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
              W
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#D1D5DB] truncate">My Workspace</div>
              <div className="text-[9px] text-[#4B5563]">Free plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0C1120]">

        {/* Top bar */}
        <div className="h-14 border-b border-[#1A2035] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#374151]">Dashboard</span>
            <span className="text-[#1F2937]">/</span>
            <span className="text-[#9CA3AF] font-medium">Overview</span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="w-44 h-7 bg-[#111827] rounded-lg border border-[#1F2937] flex items-center px-2.5 gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="text-[10px] text-[#374151]">Search...</span>
            </div>
            {/* Bell */}
            <div className="w-7 h-7 bg-[#111827] rounded-lg border border-[#1F2937] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
              U
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-5 space-y-4">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[15px] font-semibold text-[#E5E7EB]">Overview</h1>
              <p className="text-[10px] text-[#4B5563] mt-0.5">Mar 1 – Mar 4, 2026</p>
            </div>
            <div className="flex gap-1.5">
              {['Today', '7D', '30D', '90D'].map((t, i) => (
                <span key={t} className={`text-[10px] px-2.5 py-1 rounded-md font-medium ${i === 2 ? 'bg-[#6366F1]/20 text-[#818CF8]' : 'text-[#4B5563] bg-[#111827] border border-[#1F2937]'}`}>{t}</span>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-[#0F1623] border border-[#1A2035] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-[#4B5563] font-medium uppercase tracking-wide">{s.label}</p>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                </div>
                <p className="text-[22px] font-bold text-[#F9FAFB] leading-none">{s.value}</p>
                <p className="text-[10px] text-emerald-400 mt-1.5">{s.change} <span className="text-[#4B5563]">{s.sub}</span></p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-5 gap-3">

            {/* Revenue chart — 3/5 */}
            <div className="col-span-3 bg-[#0F1623] border border-[#1A2035] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#E5E7EB]">Revenue</p>
                  <p className="text-[10px] text-[#4B5563]">Monthly trend</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
                  <span className="text-[10px] text-[#6366F1] font-medium">$124,520</span>
                </div>
              </div>
              <div className="h-28">
                <BarChart />
              </div>
              <div className="flex justify-between mt-2">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                  <span key={m} className="text-[8px] text-[#374151]">{m}</span>
                ))}
              </div>
            </div>

            {/* Breakdown — 2/5 */}
            <div className="col-span-2 bg-[#0F1623] border border-[#1A2035] rounded-xl p-4">
              <p className="text-[12px] font-semibold text-[#E5E7EB] mb-0.5">Breakdown</p>
              <p className="text-[10px] text-[#4B5563] mb-4">By product category</p>
              <div className="space-y-3">
                {BREAKDOWN.map((b) => (
                  <div key={b.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#9CA3AF]">{b.label}</span>
                      <span className="text-[#6B7280] font-medium">{b.pct}%</span>
                    </div>
                    <div className="h-1 bg-[#1A2035] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Donut placeholder */}
              <div className="mt-4 flex justify-center">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#1A2035" strokeWidth="10" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#6366F1" strokeWidth="10" strokeDasharray="63 88" strokeDashoffset="22" strokeLinecap="round" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#8B5CF6" strokeWidth="10" strokeDasharray="42 109" strokeDashoffset="-41" strokeLinecap="round" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#EC4899" strokeWidth="10" strokeDasharray="27 124" strokeDashoffset="-83" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-[#0F1623] border border-[#1A2035] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-[#E5E7EB]">Recent Transactions</p>
              <span className="text-[10px] text-[#6366F1]">View all →</span>
            </div>
            <div className="grid grid-cols-5 text-[9px] text-[#374151] font-semibold uppercase tracking-widest pb-2 border-b border-[#1A2035]">
              {['Customer', 'Type', 'Amount', 'Status', 'Date'].map(h => <span key={h}>{h}</span>)}
            </div>
            <div className="space-y-2.5 mt-2.5">
              {[
                ['80%', '55%', '45%', '60%', '50%'],
                ['65%', '48%', '40%', '55%', '60%'],
                ['75%', '60%', '42%', '58%', '48%'],
                ['70%', '50%', '48%', '62%', '52%'],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-5 items-center gap-2">
                  {row.map((w, j) => <Sk key={j} w={w} h="8px" />)}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .shimmer-dk {
          background: linear-gradient(90deg, #111827 0%, #1e2a40 50%, #111827 100%);
          background-size: 200% 100%;
          animation: shimmerDk 2s infinite;
        }
        @keyframes shimmerDk {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
