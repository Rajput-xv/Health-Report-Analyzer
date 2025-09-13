import BackToTopButton from "./components/BackToTopButton";
import "./styles/BackToTopButton.css";
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
import FileUpload from './components/FileUpload';
import ReportTable from './components/ReportTable';
import TrendChart from './components/TrendChart';
import LoadingSpinner from './components/LoadingSpinner';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import ContactUs from './components/ContactUs';
import { getCurrentUser } from './utils/api';
import './styles/App.css';
import FAQ from "./components/FAQ";
import { Link } from "react-router-dom";


// Dashboard Component - Main authenticated app
function Dashboard({ user, setUser }) {
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setReportData(null);
    setTrendData(null);
    setError(null);
    toast.success("Successfully logged out. See you again!");
  };

  const handleFileProcessed = (data) => {
    setReportData(data);
    setError(null);
    toast.success("Report processed successfully!");
  };

  const handleTrendData = (trends) => {
    setTrendData(trends);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setReportData(null);
    setTrendData(null);
    toast.error(errorMessage);
  };

  const handleReset = () => {
    setReportData(null);
    setTrendData(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>🏥 Health Report Analyzer</h1>
            <p>Welcome back, {user.firstName}! Upload your lab report and get instant insights.</p>
          </div>
          <div className="header-actions">
            <Link to="/" className="btn-home">Go to Home</Link>
            <Link to="/contact" className="btn-contact">Contact Us</Link>
            <UserProfile user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>❌ {error}</span>
            <button onClick={handleReset} className="btn-retry">Try Again</button>
          </div>
        )}

        {loading && <LoadingSpinner />}

        {!reportData && !loading && (
          <FileUpload
            onFileProcessed={handleFileProcessed}
            onError={handleError}
            onLoadingChange={setLoading}
          />
        )}

        {reportData && (
          <div className="results-section">
            <div className="results-header">
              <h2>📊 Analysis Results</h2>
              <button onClick={handleReset} className="btn-new-upload">
                Upload New Report
              </button>
            </div>

            <ReportTable
              data={reportData}
              onTrendData={handleTrendData}
            />

            {trendData && (
              <TrendChart
                data={trendData}
                reportId={reportData.reportId}
              />
            )}
          </div>
        )}
      </main>

      {/* ✅ FAQ always before footer */}
      <FAQ />

      <Footer />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Check for existing user session when app loads
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          await getCurrentUser();
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          toast.info(`Welcome back, ${parsedUser.firstName}!`);
        } catch (error) {
          // Clear invalid session data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          toast.error("Session expired. Please log in again.");
        }
      }
      setAuthLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    // No navigation needed here, the Route will handle it with the Navigate component
  };

  // Display loading screen while checking authentication status
  if (authLoading) {
    return (
      <div className="app">
        <div className="auth-loading">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Landing page - accessible to all users */}
          <Route
            path="/"
            element={
              <>
                <LandingPage user={user} setUser={setUser} />
                <FAQ />
                <Footer />
              </>
            }
          />

          {/* Auto-redirect to dashboard if logged in */}
          <Route
            path="/home"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/" />
            }
          />

          {/* Auth form route */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" /> : (
                <>
                  <header className="app-header">
                    <div className="header-content">
                      <div className="header-text">
                        <h1>🏥 Health Report Analyzer</h1>
                        <p>Secure platform to analyze your health reports with AI insights</p>
                      </div>
                      <div className="header-actions">
                        <Link to="/" className="btn-home">🏠 Back to Home</Link>
                      </div>
                    </div>
                  </header>
                  <main className="app-main">
                    <AuthForm onLogin={handleLogin} isLogin={true} />
                  </main>
                  <Footer />
                </>
              )
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" /> : (
                <>
                  <header className="app-header">
                    <div className="header-content">
                      <div className="header-text">
                        <h1>🏥 Health Report Analyzer</h1>
                        <p>Secure platform to analyze your health reports with AI insights</p>
                      </div>
                      <div className="header-actions">
                        <Link to="/" className="btn-home">🏠 Back to Home</Link>
                      </div>
                    </div>
                  </header>
                  <main className="app-main">
                    <AuthForm onLogin={handleLogin} isLogin={false} />
                  </main>
                  <Footer />
                </>
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              user ? <Navigate to="/dashboard" /> : (
                <>
                  <header className="app-header">
                    <div className="header-content">
                      <div className="header-text">
                        <h1>🏥 Health Report Analyzer</h1>
                        <p>Reset your password</p>
                      </div>
                      <div className="header-actions">
                        <Link to="/" className="btn-home">🏠 Back to Home</Link>
                      </div>
                    </div>
                  </header>
                  <main className="app-main">
                    <ForgotPassword />
                  </main>
                  <Footer />
                </>
              )
            }
          />

          <Route
            path="/reset-password/:token"
            element={
              user ? <Navigate to="/dashboard" /> : (
                <>
                  <header className="app-header">
                    <div className="header-content">
                      <div className="header-text">
                        <h1>🏥 Health Report Analyzer</h1>
                        <p>Enter your new password</p>
                      </div>
                      <div className="header-actions">
                        <Link to="/" className="btn-home">🏠 Back to Home</Link>
                      </div>
                    </div>
                  </header>
                  <main className="app-main">
                    <ResetPassword />
                  </main>
                  <Footer />
                </>
              )
            }
          />

          {/* Contact Us route */}
          <Route
            path="/contact"
            element={
              user ? (
                <>
                  <header className="app-header">
                    <div className="header-content">
                      <div className="header-text">
                        <h1>🏥 Health Report Analyzer</h1>
                        <p>We'd love to hear from you!</p>
                      </div>
                      <div className="header-actions">
                        <Link to="/dashboard" className="btn-home">🏠 Back to Dashboard</Link>
                      </div>
                    </div>
                  </header>
                  <main className="app-main">
                    <ContactUs user={user} />
                  </main>
                  <Footer />
                </>
              ) : <Navigate to="/login" />
            }
          />

          {/* Protected route */}
          <Route
            path="/dashboard"
            element={
              user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Back to Top button (visible on all pages) */}
        <BackToTopButton />
      </div>
    </Router>
  );
}

export default App;