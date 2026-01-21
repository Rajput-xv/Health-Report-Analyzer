import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/NotFoundPage.css';

const NotFoundPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                {/* Animated 404 display */}
                <div className="error-code">
                    <span className="digit">4</span>
                    <div className="icon-container">
                        <FileQuestion className="question-icon" />
                    </div>
                    <span className="digit">4</span>
                </div>

                <h1 className="not-found-title">Page Not Found</h1>
                <p className="not-found-description">
                    Oops! The page you're looking for doesn't exist or has been moved.
                    Let's get you back on track.
                </p>

                <div className="not-found-actions">
                    <button className="btn-primary" onClick={() => navigate('/')}>
                        <Home size={18} />
                        <span>Go Home</span>
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                        <span>Go Back</span>
                    </button>
                </div>

                {/* Helpful links */}
                <div className="helpful-links">
                    <p className="links-title">You might be looking for:</p>
                    <div className="links-grid">
                        <button onClick={() => navigate('/dashboard')} className="helpful-link">
                            📊 Dashboard
                        </button>
                        <button onClick={() => navigate('/pricing')} className="helpful-link">
                            💎 Pricing
                        </button>
                        <button onClick={() => navigate('/contact')} className="helpful-link">
                            📧 Contact Us
                        </button>
                        <button onClick={() => navigate('/login')} className="helpful-link">
                            🔑 Login
                        </button>
                    </div>
                </div>
            </div>

            {/* Background decoration */}
            <div className="not-found-decoration">
                <div className="floating-shape shape-1"></div>
                <div className="floating-shape shape-2"></div>
                <div className="floating-shape shape-3"></div>
            </div>
        </div>
    );
};

export default NotFoundPage;
