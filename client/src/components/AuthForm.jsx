import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { login, register, googleAuth } from "../utils/api";
import { toast } from 'react-toastify';
import { FileText, Menu, X, Home } from 'lucide-react';
import "../styles/AuthForm.css";
import GoogleButton from "react-google-button";
import { auth, provider, signInWithPopup } from "./firebase.jsx";
import DarkModeToggle from './DarkModeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import Header from './Header';
import AOS from 'aos';

// SVG Icon for password visibility toggle
const EyeIcon = ({ size = 20, color = "#6b7280" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = ({ size = 20, color = "#6b7280" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

// Allowed special chars - used by both the checklist and the validator so they agree
const SPECIAL_CHAR_REGEX = /[@$!%*?&]/;
const validatePassword = (password) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return strongRegex.test(password);
};

const AuthForm = ({ onLogin, isLogin: isLoginProp }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(isLoginProp);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password validation checklist state
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });

  const navigate = useNavigate();

  // Track password changes live
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });

    setPasswordChecks({
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: SPECIAL_CHAR_REGEX.test(value),
    });
  };

  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setIsLogin(isLoginProp);
  }, [isLoginProp]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await signInWithPopup(auth, provider);
      // Send the Firebase ID token; the server reads the name/email from it
      const idToken = await result.user.getIdToken();

      // Use our backend API to authenticate with Google
      const data = await googleAuth(idToken);

      if (data.success) {
        // Save token and user locally
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success(t('toast.login_success_google', { name: data.user.firstName }));
        onLogin(data.user, data.token);
        navigate("/");
      } else {
        const errorMsg = data.error || t('toast.google_failed');
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      const errorMsg = t('toast.google_failed');
      setError(errorMsg);
      toast.error(t('toast.google_auth_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate password confirmation for signup
    if (!isLogin) {
      // Check password match
      if (formData.password !== formData.confirmPassword) {
        setError(t('validation.passwords_no_match'));
        setLoading(false);
        return;
      }

      // Validate strong password
      if (!validatePassword(formData.password)) {
        setError(t('auth_form.password_requirements_text'));
        setLoading(false);
        toast.error(t('auth_form.password_security_error'));
        return;
      }
    }

    try {
      let data;
      if (isLogin) {
        data = await login(formData.email, formData.password);
      } else {
        // Only send required fields for registration
        const registerData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword, // Added to match server expectation
        };
        data = await register(registerData);
      }

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Success toasts
        if (isLogin) {
          toast.success(t('toast.login_success_named', { name: data.user.firstName }));
        } else {
          toast.success(t('toast.signup_success_named', { name: data.user.firstName }));
        }

        onLogin(data.user, data.token);
        navigate("/");
      } else {
        const errorMessage = data.error || t('toast.auth_failed');
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || t('toast.network_error');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    });
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
            <h2>{isLogin ? t('auth.signin_title') : t('auth.signup_title')}</h2>
            <p>
              {isLogin
                ? t('auth_form.signin_description')
                : t('auth_form.signup_description')}
            </p>
          </div>

          {error && <div className="auth-error">❌ {error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Register fields */}
            {!isLogin && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">{t('auth_form.first_name')}</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required={!isLogin}
                    placeholder={t('auth_form.first_name_placeholder')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">{t('auth_form.last_name')}</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required={!isLogin}
                    placeholder={t('auth_form.last_name_placeholder')}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('auth_form.email_placeholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  required
                  placeholder={t('auth_form.password_placeholder')}
                  minLength={8}
                />
                <span
                  className="password-toggle-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
              {!isLogin && (
                <ul className="password-checklist">
                  <li className={passwordChecks.length ? "valid" : "invalid"}>{t('auth_form.password_requirements.length')}</li>
                  <li className={passwordChecks.upper ? "valid" : "invalid"}>{t('auth_form.password_requirements.upper')}</li>
                  <li className={passwordChecks.lower ? "valid" : "invalid"}>{t('auth_form.password_requirements.lower')}</li>
                  <li className={passwordChecks.number ? "valid" : "invalid"}>{t('auth_form.password_requirements.number')}</li>
                  <li className={passwordChecks.special ? "valid" : "invalid"}>{t('auth_form.password_requirements.special')}</li>
                </ul>
              )}
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">{t('auth.confirm_password')}</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder={t('validation.confirm_password_placeholder')}
                    minLength={8}
                  />
                  <span
                    className="password-toggle-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? (
                <span>
                  <span className="spinner-small"></span>
                  {isLogin ? t('auth_form.signing_in') : t('auth_form.creating_account')}
                </span>
              ) : isLogin ? (
                t('auth.login')
              ) : (
                t('auth.signup')
              )}
            </button>

            {/* Forgot password link */}
            {isLogin && (
              <div style={{ marginTop: "1rem", textAlign: "right" }}>
                <Link
                  to="/forgot-password"
                  className="btn-toggle"
                  style={{ textDecoration: "none" }}
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
            )}
          </form>

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
            <GoogleButton onClick={handleGoogleSignIn} />
          </div>

          <div className="auth-toggle">
            <p>
              {isLogin ? t('auth.no_account') : t('auth.have_account')}{" "}
              <button type="button" onClick={toggleMode} className="btn-toggle">
                {isLogin ? t('auth_form.create_one') : t('auth_form.sign_in')}
              </button>
            </p>
          </div>

          <div className="auth-demo">
            <p className="demo-notice">
              🚀 <strong>{t('auth_form.secure_platform')}:</strong> {t('auth_form.secure_description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;