import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Zap, TrendingUp, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/landing.css';
import Header from './Header';

export default function LandingPage({ user, setUser }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGetStartedClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      {/* Shared Header Component */}
      <Header user={user} setUser={setUser} />

      <section className="landing-hero-section">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title" data-aos="slide-up-fade" data-aos-delay="100">
            {t('homepage.hero_title')}
            <span className="landing-hero-subtitle animated-float" data-aos="slide-up-fade" data-aos-delay="300">{t('app.subtitle')}</span>
          </h1>
          <p className="landing-hero-description" data-aos="fade-up" data-aos-delay="500">
            {t('homepage.hero_subtitle')}
          </p>
          <div className="landing-hero-button-container" data-aos="zoom-in" data-aos-delay="700">
            <button className="landing-primary-button" onClick={handleGetStartedClick}>
              {user ? t('nav.return_to_dashboard') : t('homepage.get_started')}
            </button>
          </div>
        </div>
      </section>

      <section className="landing-features-section">
        <div className="landing-section-header" data-aos="fade-up">
          <h2 className="landing-section-title">{t('homepage.features_title')}</h2>
          <p className="landing-section-description">
            {t('homepage.platform_desc')}
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card" data-aos="fade-up" data-aos-delay="100">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-zap" data-aos="zoom-in" data-aos-delay="200">
                <Zap className="landing-icon landing-zap animated-float" />
              </div>
              <h3 className="landing-feature-title">{t('homepage.feature_1_title')}</h3>
            </div>
            <p className="landing-feature-description">
              {t('homepage.feature_1_desc')}
            </p>
          </div>

          <div className="landing-feature-card" data-aos="fade-up" data-aos-delay="300">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-shield">
                <Shield className="landing-icon landing-shield" />
              </div>
              <h3 className="landing-feature-title">{t('homepage.feature_2_title')}</h3>
            </div>
            <p className="landing-feature-description">
              {t('homepage.feature_2_desc')}
            </p>
          </div>

          <div className="landing-feature-card" data-aos="fade-up" data-aos-delay="500">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-trending-up" data-aos="zoom-in" data-aos-delay="550">
                <TrendingUp className="landing-icon landing-trending-up animated-float" />
              </div>
              <h3 className="landing-feature-title">{t('homepage.trend_tracking')}</h3>
            </div>
            <p className="landing-feature-description">
              {t('homepage.trend_tracking_desc')}
            </p>
          </div>

          <div className="landing-feature-card" data-aos="fade-up" data-aos-delay="700">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-file-text" data-aos="zoom-in" data-aos-delay="750">
                <FileText className="landing-icon landing-file-text animated-float" />
              </div>
              <h3 className="landing-feature-title">{t('homepage.feature_3_title')}</h3>
            </div>
            <p className="landing-feature-description">
              {t('homepage.feature_3_desc')}
            </p>
          </div>

          <div className="landing-feature-card" data-aos="fade-up" data-aos-delay="900">
            <div className="landing-feature-header">
              <div className="landing-feature-icon landing-clock" data-aos="zoom-in" data-aos-delay="950">
                <Clock className="landing-icon landing-clock animated-float" />
              </div>
              <h3 className="landing-feature-title">{t('homepage.available_247')}</h3>
            </div>
            <p className="landing-feature-description">
              {t('homepage.available_247_desc')}
            </p>
          </div>
        </div>
      </section>

      <section className="landing-how-it-works-section">
        <div className="landing-section-header" data-aos="fade-up">
          <h2 className="landing-section-title" data-aos="fade-up" data-aos-delay="100">{t('homepage.how_it_works')}</h2>
          <p className="landing-section-description" data-aos="fade-up" data-aos-delay="200">{t('homepage.how_it_works_desc')}</p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step" data-aos="fade-up" data-aos-delay="300">
            <div className="landing-step-number" data-aos="zoom-in" data-aos-delay="400">
              <span className="landing-step-number-text">1</span>
            </div>
            <h3 className="landing-step-title" data-aos="fade-up" data-aos-delay="450">{t('homepage.step_1_title')}</h3>
            <p className="landing-step-description" data-aos="fade-up" data-aos-delay="500">
              {t('homepage.step_1_desc')}
            </p>
          </div>

          <div className="landing-step" data-aos="fade-up" data-aos-delay="600">
            <div className="landing-step-number" data-aos="zoom-in" data-aos-delay="700">
              <span className="landing-step-number-text">2</span>
            </div>
            <h3 className="landing-step-title" data-aos="fade-up" data-aos-delay="750">{t('homepage.step_2_title')}</h3>
            <p className="landing-step-description" data-aos="fade-up" data-aos-delay="800">
              {t('homepage.step_2_desc')}
            </p>
          </div>

          <div className="landing-step" data-aos="fade-up" data-aos-delay="900">
            <div className="landing-step-number" data-aos="zoom-in" data-aos-delay="1000">
              <span className="landing-step-number-text">3</span>
            </div>
            <h3 className="landing-step-title" data-aos="fade-up" data-aos-delay="1050">{t('homepage.step_3_title')}</h3>
            <p className="landing-step-description" data-aos="fade-up" data-aos-delay="1100">{t('homepage.step_3_desc')}</p>
          </div>
        </div>
      </section>

      <section className="landing-cta-section" data-aos="fade-up">
        <div className="landing-cta-card" data-aos="zoom-in" >
          <h2 className="landing-cta-title" data-aos="fade-up" >{t('homepage.cta_title')}</h2>
          <p className="landing-cta-description" data-aos="fade-up" >
            {t('homepage.cta_desc')}
          </p>
          <div className="landing-cta-button-container" data-aos="zoom-in" >
            <button className="landing-primary-button" onClick={handleGetStartedClick}>
              {user ? t('homepage.continue_dashboard') : t('homepage.start_free')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}