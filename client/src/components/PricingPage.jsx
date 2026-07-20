import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import '../styles/PricingPage.css';

export default function PricingPage({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [message, setMessage] = useState(null);

  const PLANS = [
    {
      id: 'free',
      name: t('pricing.plans.free.name'),
      price: 0,
      period: t('pricing.plans.free.period'),
      description: t('pricing.plans.free.description'),
      features: [
        { text: t('pricing.plans.free.features.f1'), included: true },
        { text: t('pricing.plans.free.features.f2'), included: true },
        { text: t('pricing.plans.free.features.f3'), included: true },
        { text: t('pricing.plans.free.features.f4'), included: false },
        { text: t('pricing.plans.free.features.f5'), included: false },
        { text: t('pricing.plans.free.features.f6'), included: false },
      ],
      cta: t('pricing.plans.free.cta'),
      ctaAction: 'free',
      popular: false,
    },
    {
      id: 'pro_monthly',
      name: t('pricing.plans.pro_monthly.name'),
      price: 5,
      period: t('pricing.plans.pro_monthly.period'),
      description: t('pricing.plans.pro_monthly.description'),
      features: [
        { text: t('pricing.plans.pro_monthly.features.f1'), included: true },
        { text: t('pricing.plans.pro_monthly.features.f2'), included: true },
        { text: t('pricing.plans.pro_monthly.features.f3'), included: true },
        { text: t('pricing.plans.pro_monthly.features.f4'), included: true },
      ],
      cta: t('pricing.plans.pro_monthly.cta'),
      ctaAction: 'checkout',
      popular: true,
      badge: t('pricing.plans.pro_monthly.badge'),
    },
    {
      id: 'pro_yearly',
      name: t('pricing.plans.pro_yearly.name'),
      price: 45,
      period: t('pricing.plans.pro_yearly.period'),
      originalPrice: 60,
      description: t('pricing.plans.pro_yearly.description'),
      savings: t('pricing.plans.pro_yearly.savings'),
      features: [
        { text: t('pricing.plans.pro_yearly.features.f1'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f2'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f3'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f4'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f5'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f6'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f7'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f8'), included: true },
        { text: t('pricing.plans.pro_yearly.features.f9'), included: true },
      ],
      cta: t('pricing.plans.pro_yearly.cta'),
      ctaAction: 'checkout',
      popular: false,
    },
  ];

  useEffect(() => {
    // Check for payment status in URL
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setMessage({ type: 'success', text: t('pricing.messages.payment_success') });
    } else if (paymentStatus === 'cancelled') {
      setMessage({ type: 'info', text: t('pricing.messages.payment_cancelled') });
    }

    // Fetch current subscription if logged in
    if (user) {
      fetchSubscription();
    }
  }, [user, searchParams]);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/payments/subscription');
      setSubscription(response.data);
      console.log('💳 Subscription data refreshed:', response.data.plan);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleSelectPlan = async (planId) => {
    // If not logged in, redirect to signup
    if (!user) {
      navigate(`/signup?redirect=pricing&plan=${planId}`);
      return;
    }

    // If selecting free plan, just go to dashboard
    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    // If already on this plan
    if (subscription?.plan === planId) {
      setMessage({ type: 'info', text: t('pricing.messages.already_on_plan') });
      return;
    }

    setLoading(planId);
    setMessage(null);

    try {
      const response = await api.post('/payments/create-checkout', { planId });

      if (response.data.checkoutUrl) {
        // Redirect to Gumroad checkout
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('pricing.messages.checkout_failed')
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await api.get('/payments/customer-portal');
      if (response.data.portalUrl) {
        window.open(response.data.portalUrl, '_blank');
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('pricing.messages.portal_failed') });
    }
  };

  const handleSyncSubscription = async () => {
    setLoading('sync');
    setMessage(null);

    try {
      // Fetch fresh subscription data
      const response = await api.get('/payments/subscription');
      setSubscription(response.data);

      if (response.data.plan !== 'free') {
        setMessage({
          type: 'success',
          text: t('pricing.messages.sync_success', { planName: response.data.planName })
        });
      } else {
        setMessage({
          type: 'info',
          text: t('pricing.messages.sync_none')
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setMessage({
        type: 'error',
        text: t('pricing.messages.sync_failed')
      });
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (plan) => {
    if (!user) return t('pricing.buttons.get_started');
    if (subscription?.plan === plan.id) return t('pricing.buttons.current_plan');
    if (plan.id === 'free' && subscription?.plan !== 'free') return t('pricing.buttons.downgrade');
    return plan.cta;
  };

  const isCurrentPlan = (planId) => {
    return subscription?.plan === planId;
  };

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header" data-aos="fade-up">
        <h1 className="pricing-title">{t('pricing.title')}</h1>
        <p className="pricing-subtitle">
          {t('pricing.subtitle')}
        </p>

        {/* Sync button for users who just paid */}
        {user && (
          <button
            className="sync-subscription-btn"
            onClick={handleSyncSubscription}
            disabled={loading === 'sync'}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: loading === 'sync' ? '#6b7280' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading === 'sync' ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            {loading === 'sync' ? t('pricing.sync.syncing') : t('pricing.sync.button')}
          </button>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`pricing-message ${message.type}`} data-aos="fade-down">
          {message.text}
          <button onClick={() => setMessage(null)} className="message-close" aria-label={t('common.close')}>×</button>
        </div>
      )}

      {/* Current Subscription Info */}
      {subscription && subscription.plan !== 'free' && (
        <div className="subscription-info" data-aos="fade-up">
          <div className="subscription-details">
            <span className="subscription-badge">
              ✨ {t('pricing.subscription.plan_label', { planName: subscription.planName })}
              {subscription.plan === 'pro_yearly' && ` ${t('pricing.subscription.annual_billing')}`}
              {subscription.plan === 'pro_monthly' && ` ${t('pricing.subscription.monthly_billing')}`}
            </span>
            <span className="subscription-status">
              {subscription.status === 'active' ? `● ${t('pricing.subscription.active')}` : `● ${subscription.status}`}
            </span>
            {subscription.renewsAt && (
              <span className="subscription-renews">
                {t('pricing.subscription.renews', { date: new Date(subscription.renewsAt).toLocaleDateString() })}
              </span>
            )}
          </div>
          <button className="manage-btn" onClick={handleManageSubscription}>
            {t('pricing.subscription.manage_billing')}
          </button>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="pricing-grid">
        {PLANS.map((plan, index) => (
          <div
            key={plan.id}
            className={`pricing-card ${plan.popular ? 'popular' : ''} ${isCurrentPlan(plan.id) ? 'current' : ''}`}
            data-aos="fade-up"
            data-aos-delay={index * 100}
          >
            {plan.badge && !isCurrentPlan(plan.id) && <div className="pricing-badge">{plan.badge}</div>}
            {isCurrentPlan(plan.id) && <div className="current-badge">{t('pricing.your_plan')}</div>}

            <div className="pricing-card-header">
              <h2 className="plan-name">{plan.name}</h2>
              <p className="plan-description">{plan.description}</p>

              <div className="plan-price">
                {plan.originalPrice && (
                  <span className="original-price">${plan.originalPrice}</span>
                )}
                <span className="price">${plan.price}</span>
                <span className="period">/{plan.period}</span>
              </div>

              {plan.savings && (
                <div className="savings-badge">{plan.savings}</div>
              )}
            </div>

            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i} className={`feature-item ${feature.included ? '' : 'not-included'}`}>
                  <span className="feature-icon">
                    {feature.included ? '✓' : '×'}
                  </span>
                  {feature.text}
                </li>
              ))}
            </ul>

            <button
              className={`pricing-cta ${plan.popular ? 'primary' : 'secondary'} ${isCurrentPlan(plan.id) ? 'disabled' : ''}`}
              onClick={() => handleSelectPlan(plan.id)}
              disabled={loading === plan.id || isCurrentPlan(plan.id)}
            >
              {loading === plan.id ? (
                <span className="loading-spinner"></span>
              ) : (
                <span>{getButtonText(plan)}</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Usage Stats for logged-in users */}
      {subscription && (
        <div className="usage-stats" data-aos="fade-up">
          <h3>{t('pricing.usage.title')}</h3>
          <div className="usage-bar-container">
            <div
              className="usage-bar"
              style={{
                width: subscription.reportsLimit === -1
                  ? '10%'
                  : `${Math.min(100, (subscription.reportsUsed / subscription.reportsLimit) * 100)}%`
              }}
            ></div>
          </div>
          <p className="usage-text">
            {subscription.reportsLimit === -1
              ? t('pricing.usage.unlimited', { count: subscription.reportsUsed })
              : t('pricing.usage.used', { used: subscription.reportsUsed, limit: subscription.reportsLimit })
            }
          </p>
        </div>
      )}

      {/* FAQ Section */}
      <div className="pricing-faq" data-aos="fade-up">
        <h3>{t('pricing.faq.title')}</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>💳 {t('pricing.faq.q1')}</h4>
            <p>{t('pricing.faq.a1')}</p>
          </div>
          <div className="faq-item">
            <h4>🔄 {t('pricing.faq.q2')}</h4>
            <p>{t('pricing.faq.a2')}</p>
          </div>
          <div className="faq-item">
            <h4>🔒 {t('pricing.faq.q3')}</h4>
            <p>{t('pricing.faq.a3')}</p>
          </div>
          <div className="faq-item">
            <h4>👨‍👩‍👧‍👦 {t('pricing.faq.q4')}</h4>
            <p>{t('pricing.faq.a4')}</p>
          </div>
          <div className="faq-item">
            <h4>📧 {t('pricing.faq.q5')}</h4>
            <p>{t('pricing.faq.a5')}</p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-section" data-aos="fade-up">
        <div className="trust-badges">
          <div className="trust-badge">
            <span className="badge-icon">🔒</span>
            <span>{t('pricing.trust.secure_payments')}</span>
          </div>
          <div className="trust-badge">
            <span className="badge-icon">🚫</span>
            <span>{t('pricing.trust.cancel_anytime')}</span>
          </div>
          <div className="trust-badge">
            <span className="badge-icon">🌍</span>
            <span>{t('pricing.trust.global_access')}</span>
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="enterprise-cta" data-aos="fade-up">
        <div className="enterprise-icon">🏥</div>
        <div className="enterprise-content">
          <h3>{t('pricing.enterprise.title')}</h3>
          <p>{t('pricing.enterprise.description')}</p>
        </div>
        <button onClick={() => navigate('/contact')} className="enterprise-btn">
          {t('pricing.enterprise.cta')}
        </button>
      </div>
    </div>
  );
}
