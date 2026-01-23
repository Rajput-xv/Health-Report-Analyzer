import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { FileText, Menu, X, Home } from 'lucide-react';
import { forgotPassword } from "../utils/api";
import DarkModeToggle from './DarkModeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import Header from './Header';
import "../styles/AuthForm.css";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await forgotPassword(email);
      setMessage(t('forgot_password_form.reset_sent_message'));
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage(error.message || t('forgot_password_form.error_sending'));

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
            <h2>{t('auth.forgot_password')}</h2>
            <p>{t('forgot_password_form.description')}</p>
          </div>

          {message && (
            <div className={message.includes(t('forgot_password_form.reset_sent_message')) ? "auth-message" : "auth-error"}>
              {message.includes(t('forgot_password_form.reset_sent_message')) ? "✅" : "❌"} {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth_form.email_placeholder')}
              />
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span>
                  <span className="spinner-small"></span>
                  {t('forgot_password_form.sending')}
                </span>
              ) : (
                t('forgot_password_form.send_reset_link')
              )}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {t('common.remember_password')}{" "}
              <Link to="/login" className="btn-toggle" style={{ textDecoration: "none" }}>
                {t('auth.sign_in_here')}
              </Link>
            </p>
          </div>

          <div className="auth-demo">
            <p className="demo-notice">
              🔒 <strong>{t('forgot_password_form.secure_reset')}:</strong> {t('forgot_password_form.secure_reset_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;