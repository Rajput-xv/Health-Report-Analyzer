// client/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';

// English ships in the main bundle; Hindi is fetched only when it's the active language.
const loadHindi = {
  type: 'backend',
  read: (lng, ns, callback) => {
    if (lng !== 'hi') return callback(null, {});
    import('./locales/hi/translation.json').then((m) => callback(null, m.default), callback);
  },
};

i18n
  .use(loadHindi)
  .use(LanguageDetector) // detects user language
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development', // Enable debug in development
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      
      // Cache user language in localStorage
      caches: ['localStorage'],
      
      // Optional: exclude certain languages from detection
      excludeCacheFor: ['cimode'],
      
      // Optional: key used in localStorage
      lookupLocalStorage: 'i18nextLng',
      
      // Optional: check for language in URL path
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
    },
    
    react: {
      useSuspense: false, // Disable suspense to prevent blank screens on mobile
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },
  });

// Optional: Add error handling
i18n.on('failedLoading', (lng, ns, msg) => {
  console.error('Failed to load translation:', lng, ns, msg);
});

i18n.on('missingKey', (lng, namespace, key, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Missing translation key:', lng, namespace, key);
  }
});

export default i18n;