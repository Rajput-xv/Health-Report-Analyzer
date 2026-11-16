import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { forgotPassword } from "../utils/api";
import Header from './Header';
import "../styles/AuthForm.css";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await forgotPassword(email);
      setMessage(t('forgot_password_form.reset_sent_message'));
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(t(err.response?.status === 429 ? 'forgot_password_form.error_rate_limited' : 'forgot_password_form.error_sending'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* The same shared navbar as the rest of the app, on every screen size */}
      <Header user={null} setUser={() => { }} />

      <main className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.forgot_password')}</h1>
            <p>{t('forgot_password_form.description')}</p>
          </div>

          {message && <div role="alert" className="auth-message">✅ {message}</div>}
          {error && <div role="alert" className="auth-error">❌ {error}</div>}

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
      </main>
    </div>
  );
};

export default ForgotPassword;