import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import '../styles/PaymentCallback.css';

/**
 * PaymentCallback Component
 * Handles redirect from Gumroad after successful payment
 * Polls the server to verify payment was processed
 */
export default function PaymentCallback() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, pending, error
    const [message, setMessage] = useState(t('payment.verifying'));
    const [attempts, setAttempts] = useState(0);
    const [retryCount, setRetryCount] = useState(0); // bump to restart polling
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL = 2000; // 2 seconds

    const expectedPlan = searchParams.get('plan');

    // Keep the count in a ref so the polling loop reads the current value.
    // (Reading the state variable here would always see 0 and poll forever.)
    const attemptsRef = useRef(0);

    useEffect(() => {
        let timeoutId;
        let isMounted = true;

        // Reset the counter whenever polling starts again
        attemptsRef.current = 0;
        setAttempts(0);

        const verifyPayment = async () => {
            try {
                const response = await api.get(`/payments/verify-payment?expectedPlan=${expectedPlan || ''}`);

                if (!isMounted) return;

                if (response.data.isUpdated) {
                    // Payment was successful and subscription updated
                    setStatus('success');
                    setMessage(t('payment.success_message'));

                    // Wait a moment then redirect to dashboard
                    setTimeout(() => {
                        if (isMounted) {
                            navigate('/dashboard?payment=success', { replace: true });
                        }
                    }, 2000);
                } else if (attemptsRef.current < MAX_ATTEMPTS) {
                    // Not yet updated, might be webhook delay
                    attemptsRef.current += 1;
                    setAttempts(attemptsRef.current);
                    setMessage(t('payment.confirming', { current: attemptsRef.current, max: MAX_ATTEMPTS }));

                    // Poll again after interval
                    timeoutId = setTimeout(verifyPayment, POLL_INTERVAL);
                } else {
                    // Max attempts reached, show pending status
                    setStatus('pending');
                    setMessage(t('payment.pending_message'));
                }
            } catch (error) {
                console.error('Payment verification error:', error);

                if (!isMounted) return;

                if (attemptsRef.current < MAX_ATTEMPTS) {
                    attemptsRef.current += 1;
                    setAttempts(attemptsRef.current);
                    timeoutId = setTimeout(verifyPayment, POLL_INTERVAL);
                } else {
                    setStatus('error');
                    setMessage(t('payment.error_message'));
                }
            }
        };

        // Start verification
        verifyPayment();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
        // Re-runs (restarts polling) when handleRetry bumps retryCount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount, expectedPlan]);

    const handleContinue = () => {
        navigate('/dashboard?payment=success', { replace: true });
    };

    const handleRetry = () => {
        setStatus('verifying');
        setMessage(t('payment.verifying'));
        // Bumping this re-runs the effect and restarts polling
        setRetryCount((c) => c + 1);
    };

    const handleContactSupport = () => {
        navigate('/contact');
    };

    return (
        <div className="payment-callback">
            <div className="payment-callback-card" role="status" aria-live="polite">
                {status === 'verifying' && (
                    <>
                        <div className="payment-callback-spinner">
                            <div className="spinner" aria-hidden="true" />
                        </div>
                        <h2>{t('payment.processing_title')}</h2>
                        <p className="payment-callback-message">{message}</p>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                            />
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="payment-callback-icon success">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h2>{t('payment.success_title')}</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">{t('payment.redirecting')}</p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div className="payment-callback-icon pending">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <h2>{t('payment.pending_title')}</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">
                            {t('payment.pending_submessage')}
                        </p>
                        <div className="payment-callback-actions">
                            <button className="btn-primary" onClick={handleContinue}>
                                {t('homepage.continue_dashboard')}
                            </button>
                            <button className="btn-secondary" onClick={handleRetry}>
                                {t('payment.check_again')}
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="payment-callback-icon error">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h2>{t('payment.error_title')}</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">
                            {t('payment.error_submessage')}
                        </p>
                        <div className="payment-callback-actions">
                            <button className="btn-primary" onClick={handleContinue}>
                                {t('homepage.continue_dashboard')}
                            </button>
                            <button className="btn-secondary" onClick={handleContactSupport}>
                                {t('payment.contact_support')}
                            </button>
                        </div>
                    </>
                )}

                <div className="payment-callback-footer">
                    <p>{t('payment.footer_secure')} <strong>Gumroad</strong></p>
                </div>
            </div>
        </div>
    );
}
