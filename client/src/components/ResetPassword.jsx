import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { resetPassword } from "../utils/api";
import Header from './Header';
import "../styles/AuthForm.css";

// Same password rules as signup
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage(t('validation.passwords_no_match'));
      return;
    }

    // Enforce the same password rules as signup
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setMessage(t('auth_form.password_requirements_text'));
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
      setMessage(error.response?.data?.message || error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* The same shared navbar as the rest of the app, on every screen size */}
      <Header user={null} setUser={() => { }} />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{t('auth.reset_password')}</h2>
            <p>{t('reset_password.subtitle')}</p>
          </div>

          {message && (
            <div className={success ? "auth-message" : "auth-error"}>
              {success ? "✅" : "❌"} {message}
              {success && (
                <div style={{ fontSize: "0.9em", marginTop: "0.5rem" }}>
                  {t('reset_password.redirecting', { seconds: 3 })}
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
                minLength={8}
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
                minLength={8}
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
                  {t('reset_password.resetting')}
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
              🔒 <strong>{t('auth_form.secure_platform')}:</strong> {t('reset_password.secure_notice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;