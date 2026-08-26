import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
];

export default function LanguageSwitcher({ value, className = '', darkMode }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  // Follow the real app theme unless a caller explicitly passes darkMode
  const isDark = darkMode !== undefined
    ? darkMode
    : (typeof document !== 'undefined' && document.body.classList.contains('dark-mode'));

  const getCurrent = () => {
    const langFromI18n = i18n.language ? i18n.language.split('-')[0] : 'en';
    return value || langFromI18n || 'en';
  };

  const current = getCurrent();
  const currentLanguage = languages.find(lang => lang.code === current) || languages[0];

  const handleChange = (lng) => {
    i18n.changeLanguage(lng);
    setOpen(false);
    try { localStorage.setItem('i18nextLng', lng); } catch (err) { console.warn(err); }
  };

  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic background & text color for dark/light mode
  const dropdownBg = isDark ? 'rgba(32, 28, 28, 0.88)' : '#f1f1f1';
  const dropdownText = isDark ? '#fff' : '#000';
  const hoverBg = isDark ? 'rgba(50, 50, 50, 0.88)' : '#ddd';
  const selectedBg = isDark ? 'rgba(70, 70, 70, 0.88)' : '#ccc';

  return (
    <div className={`language-switcher ${className}`} ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Button with arrow */}
      <button
        onClick={() => setOpen(!open)}
        className="language-select"
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {currentLanguage.code.toUpperCase()} {open ? '▲' : '▼'}
      </button>

      {open && (
        <div
          className="language-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            marginTop: '4px',
            background: dropdownBg,
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 10,
            boxShadow: isDark
              ? '0 4px 12px rgba(0,0,0,0.5)'
              : '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {languages.map(lang => (
            <div
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{
                padding: '8px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: lang.code === current ? selectedBg : 'transparent',
                color: dropdownText,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = lang.code === current ? selectedBg : 'transparent'}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
