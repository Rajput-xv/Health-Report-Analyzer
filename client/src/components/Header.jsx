import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileText, Menu, X, LogOut, Home, LayoutDashboard, DollarSign, Mail, ChevronDown, Crown, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LanguageSwitcher from './LanguageSwitcher';
import DarkModeToggle from './DarkModeToggle';
import api from '../utils/api';
import '../styles/Header.css';

const Header = ({ user, setUser }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
    setShowUserMenu(false);
  }, [location.pathname]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user) {
        try {
          const response = await api.get('/payments/subscription');
          setSubscription(response.data);
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
        }
      }
    };
    fetchSubscription();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success(t('toast.logout_success'));
    navigate('/');
    closeMobileMenu();
    setShowUserMenu(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    ...(user ? [{ path: '/dashboard', label: t('nav.dashboard') || 'Dashboard', icon: LayoutDashboard }] : []),
    { path: '/pricing', label: t('nav.pricing') || 'Pricing', icon: DollarSign, highlight: true },
    { path: '/contact', label: t('nav.contact'), icon: Mail },
  ];

  return (
    <header className={`main-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="header-logo" aria-label={t('nav.home')}>
          <div className="logo-icon-wrapper">
            <FileText className="logo-icon" />
          </div>
          <span className="logo-text">{t('app.title')}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <LanguageSwitcher />
            <DarkModeToggle />

            {user ? (
              <div className="user-dropdown" onMouseLeave={() => setShowUserMenu(false)}>
                <button
                  className="user-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  onMouseEnter={() => setShowUserMenu(true)}
                >
                  <div className="user-avatar">
                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <span className="user-name">{user.firstName || 'User'}</span>
                  <ChevronDown size={14} className={`chevron ${showUserMenu ? 'open' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="dropdown-email">{user.email}</span>
                      {/* Subscription Status Badge */}
                      {subscription && (
                        <div className={`subscription-badge ${subscription.plan !== 'free' ? 'pro' : 'free'}`}>
                          {subscription.plan !== 'free' ? (
                            <>
                              <Crown size={12} />
                              <span>Pro</span>
                            </>
                          ) : (
                            <>
                              <Zap size={12} />
                              <span>{subscription.reportsLimit - subscription.reportsUsed} uploads left</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Link to="/dashboard" className="dropdown-item">
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/pricing" className="dropdown-item">
                      <DollarSign size={16} />
                      <span>{subscription?.plan !== 'free' ? 'Manage Plan' : 'Upgrade to Pro'}</span>
                    </Link>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>{t('auth.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn-signin" onClick={() => navigate('/login')}>
                  {t('auth.login')}
                </button>
                <button className="btn-signup" onClick={() => navigate('/signup')}>
                  {t('auth.signup')}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="mobile-nav-header">
            <Link to="/" className="mobile-logo" onClick={closeMobileMenu}>
              <FileText size={24} />
              <span>{t('app.title')}</span>
            </Link>
            <button className="mobile-close-btn" onClick={closeMobileMenu}>
              <X size={24} />
            </button>
          </div>

          <div className="mobile-nav-content">
            {user && (
              <div className="mobile-user-info">
                <div className="mobile-user-avatar">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div className="mobile-user-details">
                  <span className="mobile-user-name">{user.firstName} {user.lastName}</span>
                  <span className="mobile-user-email">{user.email}</span>
                </div>
              </div>
            )}

            <ul className="mobile-nav-links">
              {navItems.map((item) => (
                <li key={item.path}>
                  <button
                    className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      closeMobileMenu();
                    }}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {isActive(item.path) && <span className="active-indicator" />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mobile-nav-extras">
              <div className="mobile-extra-item">
                <LanguageSwitcher />
              </div>
              <div className="mobile-extra-item">
                <DarkModeToggle />
              </div>
            </div>

            <div className="mobile-nav-footer">
              {user ? (
                <button className="mobile-logout-btn" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>{t('auth.logout')}</span>
                </button>
              ) : (
                <div className="mobile-auth-buttons">
                  <button
                    className="mobile-btn-signin"
                    onClick={() => {
                      navigate('/login');
                      closeMobileMenu();
                    }}
                  >
                    {t('auth.login')}
                  </button>
                  <button
                    className="mobile-btn-signup"
                    onClick={() => {
                      navigate('/signup');
                      closeMobileMenu();
                    }}
                  >
                    {t('auth.signup')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;