import { useState } from 'react';
import nexusBlackLogo from '../../assets/logos/nexus-logo-black.png';
import { useLanguage } from '../../i18n/LanguageContext';
import type { OnboardingData } from '../../pages/WorkspaceSetupPage';

const TOTAL_STEPS = 3;

// ── Use-case option definitions ────────────────────────────────────────────
const USE_CASES = {
  he: [
    { id: 'benefits_club',    label: 'מועדון הטבות',                          keywords: /קהילה|עמותה|ארגון|חברים|מועדון/i },
    { id: 'digital_wallet',   label: 'ארנק דיגיטלי',                          keywords: /ארנק|תשלום|pay|wallet|דיגיטל/i },
    { id: 'vouchers',         label: 'תוכנית שוברים',                         keywords: /שובר|קופון|voucher|coupon/i },
    { id: 'employee_gifts',   label: 'מתנות לעובדים / מתנות לחגים',           keywords: /עובד|employee|חג|gift|מתנה|staff|צוות/i },
    { id: 'loyalty',          label: 'תוכנית נאמנות',                         keywords: /נאמנות|loyalty|נקודות|חנות|store|retail|מסחר|לקוח/i },
    { id: 'prepaid_card',     label: 'כרטיס פרי-פייד / ממותג',               keywords: /כרטיס|card|בנק|bank|פרי.פייד|prepaid/i },
    { id: 'payment',          label: 'עיבוד תשלומים לעסק שלי',               keywords: /תשלום|payment|סליקה|processing/i },
    { id: 'not_sure',         label: 'עדיין לא בטוח',                         keywords: null },
  ],
  en: [
    { id: 'benefits_club',    label: 'Benefits club',                          keywords: /community|nonprofit|organization|members|club/i },
    { id: 'digital_wallet',   label: 'Digital wallet',                         keywords: /wallet|digital|pay/i },
    { id: 'vouchers',         label: 'Voucher program',                        keywords: /voucher|coupon|gift.?card/i },
    { id: 'employee_gifts',   label: 'Employee gifts / Holiday gifts',         keywords: /employee|staff|team|holiday|gift/i },
    { id: 'loyalty',          label: 'Loyalty program',                        keywords: /loyalty|points|store|retail|shop|customer/i },
    { id: 'prepaid_card',     label: 'Prepaid / branded card',                keywords: /card|prepaid|bank|branded/i },
    { id: 'payment',          label: 'Payment processing for my business',     keywords: /payment|processing|checkout/i },
    { id: 'not_sure',         label: 'Not sure yet',                           keywords: null },
  ],
};

function getSuggested(desc: string, lang: 'he' | 'en'): string[] {
  const options = USE_CASES[lang];
  const suggested = options
    .filter(o => o.keywords && o.keywords.test(desc))
    .map(o => o.id);
  // Default when nothing matched
  return suggested.length > 0 ? suggested : ['benefits_club', 'loyalty'];
}

// ── Bilingual UI text ──────────────────────────────────────────────────────
const CONTENT = {
  he: {
    step0Title: 'קצת פרטים על הארגון שלכם',
    orgNameLabel: 'שם הארגון',
    orgNamePlaceholder: 'נקסוס בע"מ',
    websiteLabel: 'אתר',
    websitePlaceholder: 'www.example.com',
    businessLabel: 'ספרו לנו – איזה סוג עסק אתם ומה אתם מציעים',
    businessPlaceholder: 'לדוגמה: אנחנו רשת קמעונאית המציעה מוצרי אלקטרוניקה ורוצים לפתח תוכנית נאמנות ללקוחות...',
    step1Title: 'אלו הפתרונות שנראים הכי רלוונטיים לכם',
    step1Sub: 'בחרו את כל האפשרויות הרלוונטיות',
    suggested: 'מומלץ',
    step2Title: 'האם ישנן דרכים נוספות בהן תרצו להשתמש בנקסוס?',
    step2Sub: 'שלב זה הוא אופציונלי. תמיד ניתן לשנות זאת מאוחר יותר.',
    back: 'חזרה',
    skip: 'דלג לעת עתה',
    continue: 'המשך',
    finish: 'סיים הגדרה',
  },
  en: {
    step0Title: 'A bit about your organization',
    orgNameLabel: 'Organization name',
    orgNamePlaceholder: 'Nexus Ltd.',
    websiteLabel: 'Website',
    websitePlaceholder: 'www.example.com',
    businessLabel: 'What type of business are you and what do you offer?',
    businessPlaceholder: 'e.g. We are a retail chain offering electronics and want to launch a loyalty program for our customers...',
    step1Title: 'Here are the most relevant solutions for you',
    step1Sub: 'Select all that apply',
    suggested: 'Suggested',
    step2Title: 'Are there other ways you want to use Nexus?',
    step2Sub: 'This step is optional. You can always change this later.',
    back: 'Back',
    skip: 'Skip for now',
    continue: 'Continue',
    finish: 'Finish setup',
  },
};

// ── Component ──────────────────────────────────────────────────────────────
interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onBack: () => void;
}

export default function OnboardingWizard({ onComplete, onBack }: OnboardingWizardProps) {
  const { language, direction } = useLanguage();
  const lang = language === 'he' ? 'he' : 'en';
  const c = CONTENT[lang];
  const useCases = USE_CASES[lang];

  const [step, setStep] = useState(0);

  // Step 0 fields
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');

  // Step 1 state
  const [primarySelected, setPrimarySelected] = useState<string[]>([]);
  const [primarySuggested, setPrimarySuggested] = useState<string[]>([]);

  // Step 2 state
  const [extraSelected, setExtraSelected] = useState<string[]>([]);

  const togglePrimary = (id: string) =>
    setPrimarySelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleExtra = (id: string) =>
    setExtraSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const canContinue =
    step === 0 ? orgName.trim() !== '' && businessDesc.trim() !== '' :
    step === 1 ? primarySelected.length > 0 :
    true; // step 2 is optional

  const handleNext = () => {
    if (step === 0) {
      // Analyse description and pre-select suggestions
      const suggested = getSuggested(businessDesc, lang);
      setPrimarySuggested(suggested);
      setPrimarySelected(suggested);
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      onComplete({ org_name: orgName, website, business_desc: businessDesc, primary_use_cases: primarySelected, extra_use_cases: extraSelected });
    }
  };

  const handleSkip = () => {
    if (step === 0) {
      setPrimarySelected([]);
      setPrimarySuggested([]);
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 0) onBack();
    else setStep(s => s - 1);
  };

  // Back arrow: points left in LTR, right in RTL
  const BackArrow = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {direction === 'rtl'
        ? <path d="M5 12H19M12 5l7 7-7 7" />
        : <path d="M19 12H5M12 5l-7 7 7 7" />
      }
    </svg>
  );

  // Shared option button renderer
  const OptionButton = ({ id, label, selected, isSuggested, onToggle }: {
    id: string; label: string; selected: boolean; isSuggested?: boolean; onToggle: () => void;
  }) => (
    <button
      key={id}
      onClick={onToggle}
      className={`w-full text-start px-4 py-3 rounded-lg border text-[14px] transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all ${
          selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
        }`}>
          {selected && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span>{label}</span>
        {isSuggested && !selected && (
          <span className="ms-auto text-[11px] font-medium text-indigo-400">{c.suggested}</span>
        )}
      </div>
    </button>
  );

  return (
    <div className="ws-modal" dir={direction}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
        <img src={nexusBlackLogo} alt="Nexus" className="h-8 w-auto object-contain" />
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-[3px] rounded-full transition-colors duration-500 ${
                i <= step ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Content (scrollable) ── */}
      <div className="ws-content">

        {/* ── Step 0: Organisation form ── */}
        {step === 0 && (
          <>
            <h2 className="text-[21px] font-semibold text-slate-900 leading-snug mb-6">
              {c.step0Title}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  {c.orgNameLabel}
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder={c.orgNamePlaceholder}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  {c.websiteLabel}
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder={c.websitePlaceholder}
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  {c.businessLabel}
                </label>
                <textarea
                  value={businessDesc}
                  onChange={e => setBusinessDesc(e.target.value)}
                  rows={4}
                  placeholder={c.businessPlaceholder}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </>
        )}

        {/* ── Step 1: Suggested use cases ── */}
        {step === 1 && (
          <>
            <h2 className="text-[21px] font-semibold text-slate-900 leading-snug mb-1.5">
              {c.step1Title}
            </h2>
            <p className="text-[13px] text-slate-400 mb-5">{c.step1Sub}</p>
            <div className="space-y-2">
              {/* Show suggested first, then the rest */}
              {[
                ...useCases.filter(o => primarySuggested.includes(o.id)),
                ...useCases.filter(o => !primarySuggested.includes(o.id)),
              ].map(option => (
                <OptionButton
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={primarySelected.includes(option.id)}
                  isSuggested={primarySuggested.includes(option.id)}
                  onToggle={() => togglePrimary(option.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Optional extras ── */}
        {step === 2 && (
          <>
            <h2 className="text-[21px] font-semibold text-slate-900 leading-snug mb-1.5">
              {c.step2Title}
            </h2>
            <p className="text-[13px] text-slate-400 mb-5">{c.step2Sub}</p>
            <div className="space-y-2">
              {useCases
                .filter(o => !primarySelected.includes(o.id))
                .map(option => (
                  <OptionButton
                    key={option.id}
                    id={option.id}
                    label={option.label}
                    selected={extraSelected.includes(option.id)}
                    onToggle={() => toggleExtra(option.id)}
                  />
                ))}
            </div>
          </>
        )}

      </div>

      {/* ── Footer ── */}
      <div className="ws-footer-between">
        <button
          onClick={handleBack}
          className="text-[14px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5"
        >
          <BackArrow />
          {c.back}
        </button>

        <div className="flex items-center gap-3">
          {/* Skip: only on steps 0 and 1 */}
          {step < 2 && (
            <button
              onClick={handleSkip}
              className="text-[14px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              {c.skip}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue}
            className={`px-6 py-2.5 text-[14px] font-semibold rounded-lg transition-colors ${
              canContinue
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {step < TOTAL_STEPS - 1 ? c.continue : c.finish}
          </button>
        </div>
      </div>

    </div>
  );
}
