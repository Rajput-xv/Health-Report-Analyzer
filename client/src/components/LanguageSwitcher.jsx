import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
];

export default function LanguageSwitcher({ value, className = '' }) {
  const { i18n } = useTranslation();

  const getCurrent = () => {
    // prefer provided prop, otherwise use i18n.language and normalize
    const langFromI18n = i18n.language ? i18n.language.split('-')[0] : 'en';
    return value || langFromI18n || 'en';
  };

  const handleChange = (e) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try { 
      localStorage.setItem('i18nextLng', lng); 
    } catch (err) { 
      console.warn('Could not save language preference:', err);
    }
  };

  const current = getCurrent();
  const currentLanguage = languages.find(lang => lang.code === current) || languages[0];

  return (
    <div className={`language-switcher ${className}`}>
      {/* <Globe className="language-icon" size={16} /> */}
      <select
        value={current}
        onChange={handleChange}
        aria-label="Select language"
        className="language-select"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}