import React, { useEffect } from 'react';
import { Languages } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export const GoogleTranslateWidget: React.FC = () => {
  useEffect(() => {
    // Define global init callback
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
          if (!document.getElementById('google_translate_element')?.hasChildNodes()) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                includedLanguages: 'en,sw,fr,es,ar,de,zh-CN,hi,pt,so',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
              },
              'google_translate_element'
            );
          }
        } catch (e) {
          console.error('Google Translate init error:', e);
        }
      }
    };

    // Load Google Translate script if not already present
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
      <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
      <div id="google_translate_element" className="inline-block scale-95 origin-left" />
    </div>
  );
};
