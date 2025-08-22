import React, { useState } from "react";
import { Link } from "react-router-dom";
import { login, register } from "../utils/api";
import { toast } from 'react-toastify';

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    // Validate password confirmation for signup
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      toast.error("Passwords do not match");
      return;
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
          toast.success(`Welcome back, ${data.user.firstName}!`);
        } else {
          toast.success(`Account created successfully! Welcome, ${data.user.firstName}!`);
        }
        
        onLogin(data.user, data.token);
      } else {
        const errorMessage = data.error || "Authentication failed";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || "Network error. Please try again.";
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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p>
            {isLogin
              ? "Sign in to access your health reports"
              : "Join us to start analyzing your health reports"}
          </p>
        </div>

        {error && <div className="auth-error">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>
          )}

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
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <Link
                to="/forgot-password"
                style={{
                  color: "#007bff",
                  textDecoration: "none",
                }}
              >
                Forgot Password?
              </Link>
            </div>
          )}
        </form>

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