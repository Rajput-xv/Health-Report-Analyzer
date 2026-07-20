import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/NotFoundPage.css';

const NotFoundPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                {/* Animated 404 display */}
                <div className="error-code" aria-hidden="true">
                    <span className="digit">4</span>
                    <div className="icon-container">
                        <FileQuestion className="question-icon" />
                    </div>
                    <span className="digit">4</span>
                </div>

                <h1 className="not-found-title">{t('not_found.title')}</h1>
                <p className="not-found-description">
                    {t('not_found.description')}
                </p>

                <div className="not-found-actions">
                    <button className="nf-btn-primary" onClick={() => navigate('/')}>
                        <Home size={18} />
                        <span>{t('not_found.go_home')}</span>
                    </button>
                    <button className="nf-btn-secondary" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
                        <ArrowLeft size={18} />
                        <span>{t('not_found.go_back')}</span>
                    </button>
                </div>

                {/* Helpful links */}
                <div className="helpful-links">
                    <p className="links-title">{t('not_found.looking_for')}</p>
                    <div className="links-grid">
                        <button onClick={() => navigate('/dashboard')} className="helpful-link">
                            📊 {t('nav.dashboard')}
                        </button>
                        <button onClick={() => navigate('/pricing')} className="helpful-link">
                            💎 {t('nav.pricing')}
                        </button>
                        <button onClick={() => navigate('/contact')} className="helpful-link">
                            📧 {t('nav.contact')}
                        </button>
                        <button onClick={() => navigate('/login')} className="helpful-link">
                            🔑 {t('not_found.login')}
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
