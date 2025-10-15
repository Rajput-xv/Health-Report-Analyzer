import BackToTopButton from "./components/BackToTopButton";
import "./styles/BackToTopButton.css";
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import AOS from 'aos';
import { refreshAnimations, checkPerformance } from './utils/animationUtils';
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from 'react-i18next';
import AuthForm from "./components/AuthForm";
import UserProfile from "./components/UserProfile";
import FileUpload from "./components/FileUpload";
import ReportTable from "./components/ReportTable";
import TrendChart from "./components/TrendChart";
import LoadingSpinner from "./components/LoadingSpinner";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import LandingPage from "./components/LandingPage";
import Footer from "./components/Footer";
import ContactUs from "./components/ContactUs";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { getCurrentUser } from "./utils/api";
import "./styles/App.css";
import FAQ from "./components/FAQ";
import { FileText, Menu, X, LogOut } from "lucide-react";
import DarkModeToggle from "./components/DarkModeToggle";
import { useLoading } from "./context/LoadingContext.jsx";



// Dashboard Component - Main authenticated app
function Dashboard({ user, setUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { loading } = useLoading();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setReportData(null);
    setTrendData(null);
    setError(null);
    toast.success(t('toast.logout_success'));
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleFileProcessed = (data) => {
    setReportData(data);
    setError(null);
    toast.success(t('toast.upload_success'));
  };

  const handleTrendData = (trends) => {
    setTrendData(trends);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setReportData(null);
    setTrendData(null);
    toast.error(t('toast.upload_error'));
  };

  const handleReset = () => {
    setReportData(null);
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

      <header className="landing-header app-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <Link to="/" aria-label={t('nav.home')} tabIndex={0}>
              <FileText className="landing-logo-icon" />
            </Link>
            <Link to="/" className="landing-logo-text" style={{ paddingBottom: '0.5rem' }}>
              {t('app.title')}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-button user-section desktop-nav">
            <Link to="/" className="btn-home" aria-label={t('nav.home')} tabIndex={0}>
              {t('nav.home')}
            </Link>
            <Link to="/contact" className="btn-contact" aria-label={t('nav.contact')} tabIndex={0}>
              {t('nav.contact')}
            </Link>

            <div className="language-switcher-wrapper">
              <LanguageSwitcher />
            </div>

            <UserProfile
              className="user-section"
              user={user}
              onLogout={handleLogout}
              aria-label="User Profile and Logout"
              tabIndex={0}
            />

            <DarkModeToggle aria-label="Toggle Dark Mode" tabIndex={0} />
          </div>

          {/* Mobile Hamburger Button */}
          <button className="mobile-menu-button" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
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
                  {t('nav.home')}
                </button>

                <button 
                  className="mobile-menu-btn"
                  onClick={() => {
                    navigate('/contact');
                    closeMobileMenu();
                  }}
                >
                  {t('nav.contact')}
                </button>

                <button 
                  className="mobile-menu-btn mobile-logout-btn"
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                >
                  <LogOut size={16} />
                  {t('auth.logout')}
                </button>
                
                <div className="mobile-menu-item">
                  <DarkModeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        {!reportData && !loading && !error && (
          <div className="welcome-dashboard-message" data-aos="fade-down">
            <h2 data-aos="slide-up-fade" data-aos-delay="100" className="animated-pulse">{t('app.welcome')}, {user.firstName}!</h2>
            <p data-aos="slide-up-fade" data-aos-delay="300">{t('dashboard.upload_first')}</p>
          </div>
        )}

        {error && (
          <div className="error-banner" data-aos="fade-in">
            <span>{error}</span>
            <button
              onClick={handleReset}
              className="btn-retry"
              tabIndex={0}
              aria-label={t('app.try_again')}
            >
              {t('app.try_again')}
            </button>
          </div>
        )}

        {!reportData && !loading && (
          <FileUpload
            onFileProcessed={handleFileProcessed}
            onError={handleError}
            data-aos="fade-up"
            data-aos-delay="500"
          />
        )}

        {reportData && (
          <div className="results-section" data-aos="fade-up">
            <div className="results-header" data-aos="fade-down" data-aos-delay="100">
              <h2>📊 {t('reports.analysis_complete')}</h2>
              <button
                onClick={handleReset}
                className="btn-new-upload"
                tabIndex={0}
                aria-label={t('dashboard.upload_report')}
                data-aos="zoom-in" 
                data-aos-delay="300"
              >
                {t('dashboard.upload_report')}
              </button>
            </div>

            <ReportTable data={reportData} onTrendData={handleTrendData} data-aos="fade-up" data-aos-delay="400" />

            {trendData && (
              <TrendChart data={trendData} reportId={reportData.reportId} data-aos="fade-up" data-aos-delay="600" />
            )}
          </div>
        )}
      </main>

      <div data-aos="fade-up" data-aos-delay="200">
        <FAQ />
      </div>
      <div>
        <Footer />
      </div>
    </div>
  );
}

// Contact Page Component with mobile navigation
function ContactPage({ user, setUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success(t('toast.logout_success'));
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="landing-header app-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <Link to="/" aria-label={t('nav.home')} tabIndex={0}>
              <FileText className="landing-logo-icon" />
            </Link>
            <Link to="/" className="landing-logo-text" style={{ paddingBottom: '0.5rem' }}>
              {t('app.title')}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-button user-section desktop-nav">
            <Link to="/" className="btn-home" aria-label={t('nav.home')} tabIndex={0}>
              {t('nav.home')}
            </Link>
            <Link to="/contact" className="btn-contact" aria-label={t('nav.contact')} tabIndex={0}>
              {t('nav.contact')}
            </Link>

            <div className="language-switcher-wrapper">
              <LanguageSwitcher />
            </div>

            <UserProfile
              className="user-section"
              user={user}
              onLogout={handleLogout}
              aria-label="User Profile and Logout"
              tabIndex={0}
            />

            <DarkModeToggle aria-label="Toggle Dark Mode" tabIndex={0} />
          </div>

          {/* Mobile Hamburger Button */}
          <button className="mobile-menu-button" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
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
                  {t('nav.home')}
                </button>

                <button
                  className="mobile-menu-btn"
                  onClick={() => {
                    navigate('/contact');
                    closeMobileMenu();
                  }}
                >
                  {t('nav.contact')}
                </button>

                <button
                  className="mobile-menu-btn mobile-logout-btn"
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                >
                  <LogOut size={16} />
                  {t('auth.logout')}
                </button>

                <div className="mobile-menu-item">
                  <DarkModeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

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
  const { t, i18n } = useTranslation();
  const { loading } = useLoading();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize AOS for scroll animations with improved handling
  useEffect(() => {
    // Check for low-performance devices and disable animations if needed
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
  }, []);

  // Refresh animations on route change
  useEffect(() => {
    refreshAnimations();
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

  if (authLoading || loading) {
    return (
      <div className="app">
        <div className="global-loading-overlay">
          <LoadingSpinner />
          <p>{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <RouteChangeTracker />
      <div className="app">
        <Routes>

          {/* Landing page */}
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

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
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