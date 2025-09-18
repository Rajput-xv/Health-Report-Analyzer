import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import UserProfile from './UserProfile';
import DarkModeToggle from './DarkModeToggle';
import '../styles/landing.css';

const Header = ({ user, setUser, isDashboard = false }) => {
  const navigate = useNavigate();

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
    toast.success("Successfully logged out. See you again!");
  };

  return (
    <header className={isDashboard ? "landing-header app-header" : "landing-header"}>
      <div className="landing-header-content">
        <div className="landing-logo">
          <FileText className="landing-logo-icon" />
          <h1 className="landing-logo-text">Health Report Analyzer</h1>
        </div>
        
        {isDashboard ? (
          <div className="nav-button user-section">
            <Link to="/" className="btn-home">Home</Link>
            <Link to="/contact" className="btn-contact">Contact Us</Link>
            {user && <UserProfile className="user-section" user={user} onLogout={handleLogout} />}
            <DarkModeToggle />
          </div>
        ) : (
          <div className="landing-header-buttons">
            {user ? (
              <>
                <button className="landing-signin-button" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
                <button className="landing-contact-button" onClick={() => navigate('/contact')}>Contact Us</button>
                <button className="landing-logout-button" onClick={handleLogout}>
                  <LogOut size={16} className="landing-logout-icon" />Logout
                </button>
              </>
            ) : (
              <>
                <button className="landing-signin-button" onClick={handleSignInClick}>Sign In</button>
                <button className="landing-contact-button" onClick={() => navigate('/contact')}>Contact Us</button>
                <button className="landing-signup-button" onClick={handleSignUpClick}>Sign Up</button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;