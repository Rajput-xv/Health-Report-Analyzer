import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Header = ({ user, setUser, isDashboard = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignInClick = () => {
    navigate('/signin');
  };

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleLogout = () => {
    // Add your logout logic here
    setUser(null);
    navigate('/');
  };

  return (
    <header className={isDashboard ? "landing-header app-header" : "landing-header"}>
      <div className="landing-header-content">
        <div className="landing-logo">
          <FileText className="landing-logo-icon" />
          <Link to="/" className="landing-logo-text">{t('nav.home')}</Link>
        </div>

        {isDashboard ? (
          <div className="nav-button user-section">
            <Link to="/" className="btn-home">{t('nav.home')}</Link>
            <Link to="/contact" className="btn-contact">{t('nav.contact')}</Link>
            <div className="language-switcher-wrapper">
              <LanguageSwitcher />
            </div>
            {user && (
              <button className="btn-logout" onClick={handleLogout}>
                {t('auth.logout')}
              </button>
            )}
          </div>
        ) : (
          <div className="landing-header-buttons">
            <div className="language-switcher-wrapper">
              <LanguageSwitcher />
            </div>
            {!user && (
              <>
                <button className="landing-signin-button" onClick={handleSignInClick}>
                  {t('auth.login')}
                </button>
                <button className="landing-contact-button" onClick={() => navigate('/contact')}>
                  {t('nav.contact')}
                </button>
                <button className="landing-signup-button" onClick={handleSignUpClick}>
                  {t('auth.signup')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;