import { useEffect } from 'react';
import { LanguageProvider } from '../i18n/LanguageContext';
import HomeContent from './HomeContent';

// Inject Rubik font only when Hebrew page is actually visited.
// This avoids loading ~200KB of Hebrew font for English-only visitors.
function useRubikFont() {
  useEffect(() => {
    const linkId = 'rubik-font';
    if (document.getElementById(linkId)) return; // already loaded
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
}

export default function HomeHe() {
  useRubikFont();
  return (
    <LanguageProvider language="he">
      <HomeContent />
    </LanguageProvider>
  );
}
