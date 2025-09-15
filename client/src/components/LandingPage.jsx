// import React from 'react';
import React, { useState } from 'react';  // ⬅ add useState
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Zap, TrendingUp, Clock, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/landing.css'

export default function LandingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  const handleSignInClick = () => {
    navigate('/login');
  };

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowDialog(false);
    toast.success("Successfully logged out. See you again!");
    navigate('/'); //redirect to homepage after logout
  };

  const handleGetStartedClick = () => {
    // If user is already logged in, go to dashboard
    // If not logged in, go to login page
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <FileText className="landing-logo-icon" />
            {/* <img src="/Health%20Report%20Analyzer%20Logo.png" alt="Logo" className="logo-img" /> */}
            <h1 className="landing-logo-text">Health Report Analyzer</h1>
          </div>
          <div className="landing-header-buttons">
            {user ? (
              <>
                <button className="landing-signin-button" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
                <button className="landing-contact-button" onClick={() => navigate('/contact')}>Contact Us</button>
                <div className="dashboard-profile">
                  <button onClick={() => setShowDialog(true)} className="btn-logout">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="landing-signin-button" onClick={handleSignInClick}> Sign In </button>
                <button className="landing-contact-button" onClick={() => navigate('/contact')}>Contact Us</button>
                <button className="landing-signup-button" onClick={handleSignUpClick}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </header>

       {/* ---------- Floating overlay confirmation (top-right) ---------- */}
      {showDialog && (
        <div className="overlay-popup" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <div className="overlay-header">
              <LogOut size={18} className="overlay-icon" />
              <div className="overlay-title">Confirm Logout</div>
            </div>
            <div className="overlay-body">
              <div className="overlay-text">
                Are you sure you want to log out?
                <div className="overlay-subtext">You’ll need to sign in again to continue.</div>
              </div>
              <div className="overlay-actions">
                <button className="btn-confirm" onClick={handleLogout}>
                  Yes, Logout
                </button>
                <button className="btn-cancel" onClick={() => setShowDialog(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            Analyze Your Health Reports
            <span className="landing-hero-subtitle">with Advanced Technology</span>
          </h1>
          <p className="landing-hero-description">
            Upload your medical reports and get instant, comprehensive analysis with personalized insights. Our advanced
            technology helps you understand your health data like never before.
          </p>
          <div className="landing-hero-button-container">
            <button className="landing-primary-button" onClick={handleGetStartedClick}>
              {user ? "Return to Dashboard" : "Get Started Free"}
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Why Choose Health Report Analyzer?</h2>
          <p className="landing-section-description">
            Transform complex medical data into clear, actionable insights with our cutting-edge platform
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-zap">
                <Zap className="landing-icon landing-zap" />
              </div>
              <h3 className="landing-feature-title">Instant Analysis</h3>
            </div>
            <p className="landing-feature-description">
              Get comprehensive analysis of your health reports in seconds using advanced OCR technology.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-shield">
                <Shield className="landing-icon landing-shield" />
              </div>
              <h3 className="landing-feature-title">Secure & Private</h3>
            </div>
            <p className="landing-feature-description">
              Your health data is encrypted and protected with enterprise-grade security. We never store your reports.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-trending-up">
                <TrendingUp className="landing-icon landing-trending-up" />
              </div>
              <h3 className="landing-feature-title">Trend Tracking</h3>
            </div>
            <p className="landing-feature-description">
              Monitor your health metrics over time and identify important trends in your medical data.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-file-text">
                <FileText className="landing-icon landing-file-text" />
              </div>
              <h3 className="landing-feature-title">Multiple Formats</h3>
            </div>
            <p className="landing-feature-description">
              Support for various report formats including PNG, JPEG, JPG images and scanned documents.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-clock">
                <Clock className="landing-icon landing-clock" />
              </div>
              <h3 className="landing-feature-title">24/7 Available</h3>
            </div>
            <p className="landing-feature-description">
              Access your health insights anytime, anywhere with our cloud-based platform.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">How It Works</h2>
          <p className="landing-section-description">Get insights from your health reports in three simple steps</p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step">
            <div className="landing-step-number">
              <span className="landing-step-number-text">1</span>
            </div>
            <h3 className="landing-step-title">Upload Report</h3>
            <p className="landing-step-description">
              Simply drag and drop your health report or take a photo with your device
            </p>
          </div>

          <div className="landing-step">
            <div className="landing-step-number">
              <span className="landing-step-number-text">2</span>
            </div>
            <h3 className="landing-step-title">Smart Analysis</h3>
            <p className="landing-step-description">
              Our advanced technology processes and analyzes your report data in real-time
            </p>
          </div>

          <div className="landing-step">
            <div className="landing-step-number">
              <span className="landing-step-number-text">3</span>
            </div>
            <h3 className="landing-step-title">Get Insights</h3>
            <p className="landing-step-description">Receive detailed analysis with explanations and recommendations</p>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="landing-cta-section">
        <div className="landing-cta-card">
          <h2 className="landing-cta-title">Ready to Understand Your Health Better?</h2>
          <p className="landing-cta-description">
            Join thousands of users who trust Health Report Analyzer for their medical insights. Start your journey to
            better health understanding today.
          </p>
          <div className="landing-cta-button-container">
            <button className="landing-primary-button" onClick={handleGetStartedClick}>
              {user ? "Continue to Dashboard" : "Start Free Analysis"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}