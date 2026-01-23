import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { FileText, Menu, X, Home } from 'lucide-react';
import { resetPassword } from "../utils/api";
import DarkModeToggle from './DarkModeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import Header from './Header';
import "../styles/AuthForm.css";

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage(t('validation.passwords_no_match'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setMessage(t('auth.password_reset_success'));
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Mobile Only Header (Shared) */}
      <div className="mobile-only-header">
        <Header user={null} setUser={() => { }} />
      </div>

      {/* Auth Page Header (Desktop Only) */}
      <header className="auth-header desktop-only-auth-header">
        <div className="auth-header-content">
          <div className="auth-logo">
            <FileText className="auth-logo-icon" />
            <Link to="/" className="auth-logo-text">
              {t('app.title')}
            </Link>
          </div>

          <div className="auth-header-buttons desktop-nav">
            <div className="language-switcher-wrapper">
              <LanguageSwitcher />
            </div>
            <button className="auth-home-button" onClick={() => navigate('/')}>
              <Home size={16} />
              {t('nav.home')}
            </button>
            <DarkModeToggle />
          </div>

          <button className="mobile-menu-button" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
            <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <span className="mobile-menu-title">{t('app.title')}</span>
                <button className="mobile-menu-close" onClick={closeMobileMenu}>
                  <X size={20} />
                </button>
              </div>

              <div className="mobile-menu-content">
                <div className="mobile-menu-item">
                  <LanguageSwitcher />
                </div>

                <button
                  className="mobile-menu-btn"
                  onClick={() => {
                    navigate('/');
                    closeMobileMenu();
                  }}
                >
                  <Home size={16} />
                  {t('nav.home')}
                </button>

                <div className="mobile-menu-item">
                  <DarkModeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{t('auth.reset_password')}</h2>
            <p>Enter your new password below</p>
          </div>

          {message && (
            <div className={success ? "auth-message" : "auth-error"}>
              {success ? "✅" : "❌"} {message}
              {success && (
                <div style={{ fontSize: "0.9em", marginTop: "0.5rem" }}>
                  Redirecting to login in 3 seconds...
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">{t('auth.new_password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('validation.new_password_placeholder')}
                minLength={6}
              />
              <small className="form-hint">
                {t('validation.password_min_length')}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirm_password')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder={t('validation.confirm_password_placeholder')}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={loading || success}
            >
              {loading ? (
                <span>
                  <span className="spinner-small"></span>
                  Resetting...
                </span>
              ) : (
                t('auth.reset_password')
              )}
            </button>
          </form>

          {!success && (
            <div className="auth-toggle">
              <p>
                {t('common.remember_password')}{" "}
                <Link to="/login" className="btn-toggle" style={{ textDecoration: "none" }}>
                  {t('auth.sign_in_here')}
                </Link>
              </p>
              <p>
                <Link to="/" className="btn-toggle" style={{ textDecoration: "none" }}>
                  {t('common.back_home')}
                </Link>
              </p>
            </div>
          )}

          <div className="auth-demo">
            <p className="demo-notice">
              🔒 <strong>Secure Platform:</strong> Your new password will be encrypted and stored securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;