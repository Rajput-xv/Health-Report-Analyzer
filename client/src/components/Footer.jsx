import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/App.css';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
      <p>{t('footer.disclaimer')}</p>
    </footer>
  );
};

export default Footer;
