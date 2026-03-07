import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Mail, Users, MessageSquare, Linkedin, Twitter, Facebook } from 'lucide-react';

export default function BlogSubscribeSection() {
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section className="bg-slate-900 py-16 md:py-20" dir={direction}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Three-column grid */}
        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {/* Column 1: Subscribe */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#635BFF]/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#635BFF]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {isHe ? 'הירשמו לבלוג' : 'Subscribe to our blog'}
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              {isHe
                ? 'קבלו מדריכים, תובנות ופרקטיקות מובילות ישירות למייל.'
                : 'Get guides, insights, and best practices delivered to your inbox.'}
            </p>
            {submitted ? (
              <p className="text-sm text-emerald-400 font-medium">
                {isHe ? 'תודה! נרשמתם בהצלחה.' : 'Thanks! You\'re subscribed.'}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isHe ? 'כתובת אימייל' : 'Email address'}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#635BFF] text-white text-sm font-medium hover:bg-[#5147e5] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isHe ? 'הרשמה' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>

          {/* Column 2: We're hiring */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {isHe ? 'הצטרפו לצוות' : 'Join our team'}
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              {isHe
                ? 'אנחנו בונים את העתיד של תשתיות נאמנות ותשלומים. רוצים להצטרף?'
                : 'We\'re building the future of loyalty and payments infrastructure. Want to join?'}
            </p>
            <a
              href={isHe ? '/he/signup' : '/signup'}
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isHe ? 'ראו משרות פתוחות' : 'View open positions'}
              <span className={isHe ? 'rotate-180' : ''}>→</span>
            </a>
          </div>

          {/* Column 3: Feedback */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {isHe ? 'יש לכם פידבק?' : 'Have feedback?'}
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              {isHe
                ? 'נשמח לשמוע מכם – שאלות, הצעות לשיפור, או רעיונות לתוכן.'
                : 'We\'d love to hear from you – questions, suggestions, or content ideas.'}
            </p>
            <a
              href="mailto:hello@nexus-pay.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {isHe ? 'צרו קשר' : 'Get in touch'}
              <span className={isHe ? 'rotate-180' : ''}>→</span>
            </a>
          </div>
        </div>

        {/* Social icons */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {isHe ? 'עקבו אחרינו' : 'Follow us'}
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://linkedin.com/company/nexus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/nexus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com/nexus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
