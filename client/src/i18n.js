// client/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';

const resources = {
  en: {
    translation: en
  },
  hi: {
    translation: hi
  }
};

i18n
  .use(LanguageDetector) // detects user language
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
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
      useSuspense: true, // Enable suspense integration
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