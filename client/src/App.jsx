import BackToTopButton from "./components/BackToTopButton";
import "./styles/BackToTopButton.css";
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { refreshAnimations, checkPerformance } from './utils/animationUtils';
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from 'react-i18next';
import AuthForm from "./components/AuthForm";
import FileUpload from "./components/FileUpload";
import TrendChart from "./components/TrendChart";
import LoadingSpinner from "./components/LoadingSpinner";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import LandingPage from "./components/LandingPage";
import Footer from "./components/Footer";
import ContactUs from "./components/ContactUs";
import { getCurrentUser } from "./utils/api";
import "./styles/App.css";
import FAQ from "./components/FAQ";
import { useLoading } from "./context/LoadingContext.jsx";
import { ReportsList, ReportDetail } from "./components/ReportList";
import Stats from "./components/Stats";
import PricingPage from "./components/PricingPage";
import Header from "./components/Header";
import AnalyticsTracker from './AnalyticsTracker';
import NotFoundPage from "./components/NotFoundPage";

function Dashboard({ user, setUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [uploadedReportId, setUploadedReportId] = useState(null);
  const [viewingReportId, setViewingReportId] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [error, setError] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);

  const { loading } = useLoading();

  // Check for payment success/cancelled in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      setPaymentMessage({ type: 'success', text: '🎉 Payment successful! Your Pro subscription is now active. Enjoy unlimited uploads!' });
      toast.success('🎉 Welcome to Pro! Enjoy unlimited uploads.');
      // Clear the URL parameter
      navigate('/dashboard', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setPaymentMessage({ type: 'info', text: 'Payment was cancelled. You can upgrade anytime from the pricing page.' });
      navigate('/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  const handleFileProcessed = (data) => {
    setUploadedReportId(data.reportId || data._id);
    setViewingReportId(data.reportId || data._id);
    setError(null);
    toast.success(t('toast.upload_success'));
  };

  const handleTrendData = (trends) => {
    setTrendData(trends);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setUploadedReportId(null);
    setViewingReportId(null);
    setTrendData(null);
    toast.error(t('toast.upload_error'));
  };

  const handleReset = () => {
    setUploadedReportId(null);
    setViewingReportId(null);
    setTrendData(null);
    setError(null);
  };

  return (
    <div className="app">
      {loading && (
        <div className="global-loading-overlay">
          <LoadingSpinner />
        </div>
      )}

      <Header user={user} setUser={setUser} />

      <main className="app-main">
        {/* Payment Success/Cancelled Message */}
        {paymentMessage && (
          <div className={`payment-message ${paymentMessage.type}`} style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            borderRadius: '12px',
            backgroundColor: paymentMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${paymentMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            color: paymentMessage.type === 'success' ? '#16a34a' : '#2563eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.95rem'
          }}>
            <span>{paymentMessage.text}</span>
            <button
              onClick={() => setPaymentMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.7 }}
            >×</button>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={handleReset} className="btn-retry" tabIndex={0}>
              {t('app.try_again')}
            </button>
          </div>
        )}

        {/* Viewing a specific report */}
        {viewingReportId && (
          <div>
            <ReportDetail
              reportId={viewingReportId}
              onBack={handleReset}
            />
          </div>
        )}

        {/* Viewing reports list */}
        {!viewingReportId && !uploadedReportId && (
          <>
            {!loading && (
              <div className="welcome-dashboard-message">
                <h2>{t('app.welcome')}, {user.firstName}!</h2>
                <p>{t('dashboard.upload_first')}</p>
              </div>
            )}

            <FileUpload
              onFileProcessed={handleFileProcessed}
              onError={handleError}
            />

            <ReportsList onSelectReport={setViewingReportId} />
          </>
        )}
      </main>

      <div>
        <FAQ />
      </div>
      <div>
        <Footer />
      </div>
    </div>
  );
}

// Contact Page Component - now uses shared Header
function ContactPage({ user, setUser }) {
  return (
    <>
      <Header user={user} setUser={setUser} />
      <main className="app-main">
        <ContactUs user={user} />
      </main>
      <Footer />
    </>
  );
}

// RouteChangeTracker component to refresh animations on route changes
function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    refreshAnimations();
  }, [location]);

  return null;
}

function App() {
  const { t, i18n, ready } = useTranslation();
  const { loading } = useLoading();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize AOS for scroll animations with improved handling
  useEffect(() => {
    // Detect mobile to skip complex animations
    const isMobile = window.innerWidth < 768;

    if (!isMobile) {
      // Only check performance and add listeners on desktop
      checkPerformance();

      // Refresh animations on window resize with debounce for performance
      const handleResize = () => {
        refreshAnimations();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      // Initial refresh
      refreshAnimations();

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, []);

  // Refresh animations on route change (only on desktop)
  useEffect(() => {
    if (window.innerWidth >= 768) {
      refreshAnimations();
    }
  }, [window.location.pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          await getCurrentUser();
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          toast.info(t('toast.login_success', { name: parsedUser.firstName }));
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.error(t('toast.logout_success'));
        }
      }
      setAuthLoading(false);
    };

    checkAuth();
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language || 'en';
    document.title = t('app.title');
  }, [i18n.language, t]);

  useEffect(() => {
    const handleLanguageChange = (lng) => {
      document.documentElement.lang = lng;
      document.title = t('app.title');
      document.documentElement.dir = lng === 'ar' || lng === 'he' ? 'rtl' : 'ltr';
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, t]);

  const handleLogin = (userData, token) => {
    setUser(userData);
  };

  // Show loading screen if translations not ready or auth is loading
  if (!ready || authLoading || loading) {
    return (
      <div className="app">
        <div className="global-loading-overlay">
          <LoadingSpinner />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AnalyticsTracker />
      <RouteChangeTracker />
      <div className="app">
        <Routes>

          {/* Landing page */}
          <Route
            path="/"
            element={
              <>
                <LandingPage user={user} setUser={setUser} />
                <Stats />
                <FAQ />
                <Footer />
              </>
            }
          />

          {/* Landing page - default route for non-authenticated users */}
          <Route
            path="/home"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/" />
            }
          />

          {/* Dashboard redirect */}
          <Route
            path="/home"
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/" />}
          />

          {/* Login - AuthForm has its own responsive header */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <>
                  <AuthForm onLogin={handleLogin} isLogin={true} />
                  <Footer />
                </>
              )
            }
          />

          {/* Signup - AuthForm has its own responsive header */}
          <Route
            path="/signup"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <>
                  <AuthForm onLogin={handleLogin} isLogin={false} />
                  <Footer />
                </>
              )
            }
          />

          {/* Forgot Password - has its own responsive header */}
          <Route
            path="/forgot-password"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <>
                  <ForgotPassword />
                  <Footer />
                </>
              )
            }
          />

          {/* Reset Password - has its own responsive header */}
          <Route
            path="/reset-password/:token"
            element={
              user ? (
                <Navigate to="/dashboard" />
              ) : (
                <>
                  <ResetPassword />
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
                <ContactPage user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Pricing Page - accessible to all */}
          <Route
            path="/pricing"
            element={
              <>
                <Header user={user} setUser={setUser} />
                <PricingPage user={user} />
                <Footer />
              </>
            }
          />

          {/* Gumroad Callback - redirect after purchase */}
          <Route
            path="/callback"
            element={
              <Navigate to="/dashboard?payment=success" replace />
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              user ? (
                <Dashboard user={user} setUser={setUser} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* Catch all - 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={i18n.language === 'ar' || i18n.language === 'he'}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <BackToTopButton />
      </div>
    </Router>
  );
}

export default App;