import React, { useState } from "react";
import { login, register, forgotPassword } from "../utils/api"; // Add forgotPassword here

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // new state for forgot password form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // success messages

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isForgotPassword) {
        // call forgot password API
        await forgotPassword(formData.email);
        setMessage("If the email exists, a reset link has been sent.");
      } else {
        let data;
        if (isLogin) {
          data = await login(formData.email, formData.password);
        } else {
          data = await register(formData);
        }

        if (data.success) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          onLogin(data.user, data.token);
        } else {
          setError(data.error || "Authentication failed");
        }
      }
    } catch (error) {
      setError(error.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError("");
    setMessage("");
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    });
  };

  const showForgotPassword = () => {
    setIsForgotPassword(true);
    setError("");
    setMessage("");
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    });
  };

  const backToLogin = () => {
    setIsForgotPassword(false);
    setError("");
    setMessage("");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isForgotPassword
              ? "Forgot Password"
              : isLogin
              ? "Welcome Back"
              : "Create Account"}
          </h2>
          <p>
            {isForgotPassword
              ? "Enter your email to receive a reset link"
              : isLogin
              ? "Sign in to access your health reports"
              : "Join us to start analyzing your health reports"}
          </p>
        </div>

        {error && <div className="auth-error">❌ {error}</div>}
        {message && <div className="auth-message">✅ {message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Forgot Password Form */}
          {isForgotPassword ? (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="btn-toggle"
                onClick={backToLogin}
                disabled={loading}
                style={{ marginTop: "1rem" }}
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              {/* Register fields */}
              {!isLogin && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required={!isLogin}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required={!isLogin}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                />
                {!isLogin && (
                  <small className="form-hint">
                    Password must be at least 6 characters
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <span>
                    <span className="spinner-small"></span>
                    {isLogin ? "Signing In..." : "Creating Account..."}
                  </span>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Forgot password link */}
              {isLogin && (
                <p
                  style={{
                    marginTop: "1rem",
                    textAlign: "right",
                    cursor: "pointer",
                    color: "#007bff",
                    textDecoration: "underline",
                  }}
                  onClick={showForgotPassword}
                >
                  Forgot Password?
                </p>
              )}
            </>
          )}
        </form>

        {!isForgotPassword && (
          <div className="auth-toggle">
            <p>
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <button type="button" onClick={toggleMode} className="btn-toggle">
                {isLogin ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        )}

        <div className="auth-demo">
          <p className="demo-notice">
            🚀 <strong>Secure Platform:</strong> Your data is securely stored in
            our cloud database with industry-standard encryption and
            authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
