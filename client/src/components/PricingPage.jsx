import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import '../styles/PricingPage.css';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out the platform',
    features: [
      { text: '3 reports per month', included: true },
      { text: 'Basic health insights', included: true },
      { text: '7-day report history', included: true },
      { text: 'Email support', included: true },
      { text: 'Trend analysis', included: false },
      { text: 'PDF export', included: false },
      { text: 'Family sharing', included: false },
    ],
    cta: 'Current Plan',
    ctaAction: 'free',
    popular: false,
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: 5,
    period: 'month',
    description: 'Best for regular health tracking',
    features: [
      { text: 'Unlimited reports', included: true },
      { text: 'Advanced AI insights', included: true },
      { text: 'Trend analysis & charts', included: true },
      { text: 'PDF export', included: true },
      { text: 'Family sharing (5 members)', included: true },
      { text: 'Priority support', included: true },
      { text: 'Unlimited history', included: true },
    ],
    cta: 'Get Started',
    ctaAction: 'checkout',
    popular: true,
    badge: 'Most Popular',
  },
  {
    id: 'pro_yearly',
    name: 'Pro Annual',
    price: 45,
    period: 'year',
    originalPrice: 60,
    description: 'Save 25% with annual billing',
    savings: '3 months free!',
    features: [
      { text: 'Everything in Pro Monthly', included: true },
      { text: 'Unlimited report history', included: true },
      { text: 'Early access to features', included: true },
      { text: 'Annual health summary', included: true },
      { text: 'Priority feature requests', included: true },
    ],
    cta: 'Save 25%',
    ctaAction: 'checkout',
    popular: false,
  },
];

export default function PricingPage({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Check for payment status in URL
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setMessage({ type: 'success', text: '🎉 Payment successful! Your subscription is now active.' });
    } else if (paymentStatus === 'cancelled') {
      setMessage({ type: 'info', text: 'Payment was cancelled. You can try again anytime.' });
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
      setMessage({ type: 'info', text: 'You are already on this plan!' });
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
        text: error.response?.data?.error || 'Failed to start checkout. Please try again.' 
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
      setMessage({ type: 'error', text: 'Failed to open billing portal' });
    }
  };

  const getButtonText = (plan) => {
    if (!user) return 'Get Started';
    if (subscription?.plan === plan.id) return 'Current Plan';
    if (plan.id === 'free' && subscription?.plan !== 'free') return 'Downgrade';
    return plan.cta;
  };

  const isCurrentPlan = (planId) => {
    return subscription?.plan === planId;
  };

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header" data-aos="fade-up">
        <h1 className="pricing-title">Simple, Transparent Pricing</h1>
        <p className="pricing-subtitle">
          Choose the plan that fits your health journey. Cancel anytime.
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`pricing-message ${message.type}`} data-aos="fade-down">
          {message.text}
          <button onClick={() => setMessage(null)} className="message-close">×</button>
        </div>
      )}

      {/* Current Subscription Info */}
      {subscription && subscription.plan !== 'free' && (
        <div className="subscription-info" data-aos="fade-up">
          <div className="subscription-details">
            <span className="subscription-badge">
              ✨ {subscription.planName} Plan
            </span>
            <span className="subscription-status">
              {subscription.status === 'active' ? '● Active' : `● ${subscription.status}`}
            </span>
            {subscription.renewsAt && (
              <span className="subscription-renews">
                Renews {new Date(subscription.renewsAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <button className="manage-btn" onClick={handleManageSubscription}>
            Manage Billing
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
            {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
            {isCurrentPlan(plan.id) && <div className="current-badge">Your Plan</div>}
            
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
                getButtonText(plan)
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Usage Stats for logged-in users */}
      {subscription && (
        <div className="usage-stats" data-aos="fade-up">
          <h3>Your Usage This Month</h3>
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
              ? `${subscription.reportsUsed} reports uploaded (Unlimited)`
              : `${subscription.reportsUsed} of ${subscription.reportsLimit} reports used`
            }
          </p>
        </div>
      )}

      {/* FAQ Section */}
      <div className="pricing-faq" data-aos="fade-up">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>💳 What payment methods do you accept?</h4>
            <p>We accept all major credit cards, debit cards, and PayPal through our secure payment partner Gumroad.</p>
          </div>
          <div className="faq-item">
            <h4>🔄 Can I cancel anytime?</h4>
            <p>Yes! Cancel your subscription anytime from your Gumroad library. You'll keep access until the end of your billing period.</p>
          </div>
          <div className="faq-item">
            <h4>🔒 Is my health data secure?</h4>
            <p>Absolutely. We use bank-level encryption and never share your data with third parties.</p>
          </div>
          <div className="faq-item">
            <h4>👨‍👩‍👧‍👦 How does family sharing work?</h4>
            <p>Pro users can invite up to 5 family members to share their subscription. Each member gets their own private account.</p>
          </div>
          <div className="faq-item">
            <h4>📧 How do I get support?</h4>
            <p>Free users get email support. Pro users get priority support with faster response times.</p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-section" data-aos="fade-up">
        <div className="trust-badges">
          <div className="trust-badge">
            <span className="badge-icon">🔒</span>
            <span>Secure Payments</span>
          </div>
          <div className="trust-badge">
            <span className="badge-icon">🚫</span>
            <span>Cancel Anytime</span>
          </div>
          <div className="trust-badge">
            <span className="badge-icon">🌍</span>
            <span>Global Access</span>
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="enterprise-cta" data-aos="fade-up">
        <div className="enterprise-icon">🏥</div>
        <div className="enterprise-content">
          <h3>Need a solution for your clinic or hospital?</h3>
          <p>We offer custom enterprise plans with API access, white-labeling, and dedicated support.</p>
        </div>
        <button onClick={() => navigate('/contact')} className="enterprise-btn">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
