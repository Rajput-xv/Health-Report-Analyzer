import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import '../styles/PaymentCallback.css';

/**
 * PaymentCallback Component
 * Handles redirect from Gumroad after successful payment
 * Polls the server to verify payment was processed
 */
export default function PaymentCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, pending, error
    const [message, setMessage] = useState('Verifying your payment...');
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL = 2000; // 2 seconds

    const expectedPlan = searchParams.get('plan');
    const saleId = searchParams.get('sale_id'); // Gumroad may include this

    useEffect(() => {
        let timeoutId;
        let isMounted = true;

        const verifyPayment = async () => {
            try {
                const response = await api.get(`/payments/verify-payment?expectedPlan=${expectedPlan || ''}`);

                if (!isMounted) return;

                if (response.data.isUpdated) {
                    // Payment was successful and subscription updated
                    setStatus('success');
                    setMessage('🎉 Payment successful! Your subscription is now active.');

                    // Wait a moment then redirect to dashboard
                    setTimeout(() => {
                        if (isMounted) {
                            navigate('/dashboard?payment=success', { replace: true });
                        }
                    }, 2000);
                } else if (attempts < MAX_ATTEMPTS) {
                    // Not yet updated, might be webhook delay
                    setAttempts(prev => prev + 1);
                    setMessage(`Confirming your payment... (${attempts + 1}/${MAX_ATTEMPTS})`);

                    // Poll again after interval
                    timeoutId = setTimeout(verifyPayment, POLL_INTERVAL);
                } else {
                    // Max attempts reached, show pending status
                    setStatus('pending');
                    setMessage('Your payment is being processed. This may take a few moments.');
                }
            } catch (error) {
                console.error('Payment verification error:', error);

                if (!isMounted) return;

                if (attempts < MAX_ATTEMPTS) {
                    setAttempts(prev => prev + 1);
                    timeoutId = setTimeout(verifyPayment, POLL_INTERVAL);
                } else {
                    setStatus('error');
                    setMessage('Unable to verify payment. Please check your email for confirmation.');
                }
            }
        };

        // Start verification
        verifyPayment();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleContinue = () => {
        navigate('/dashboard?payment=success', { replace: true });
    };

    const handleRetry = () => {
        setStatus('verifying');
        setAttempts(0);
        setMessage('Verifying your payment...');
    };

    const handleContactSupport = () => {
        navigate('/contact');
    };

    return (
        <div className="payment-callback">
            <div className="payment-callback-card">
                {status === 'verifying' && (
                    <>
                        <div className="payment-callback-spinner">
                            <LoadingSpinner />
                        </div>
                        <h2>Processing Payment</h2>
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h2>Payment Successful!</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">Redirecting to dashboard...</p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div className="payment-callback-icon pending">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <h2>Payment Processing</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">
                            You'll receive an email confirmation shortly. Your subscription will be activated automatically.
                        </p>
                        <div className="payment-callback-actions">
                            <button className="btn-primary" onClick={handleContinue}>
                                Continue to Dashboard
                            </button>
                            <button className="btn-secondary" onClick={handleRetry}>
                                Check Again
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="payment-callback-icon error">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h2>Verification Issue</h2>
                        <p className="payment-callback-message">{message}</p>
                        <p className="payment-callback-submessage">
                            If you completed the payment, your subscription should be activated within a few minutes.
                        </p>
                        <div className="payment-callback-actions">
                            <button className="btn-primary" onClick={handleContinue}>
                                Continue to Dashboard
                            </button>
                            <button className="btn-secondary" onClick={handleContactSupport}>
                                Contact Support
                            </button>
                        </div>
                    </>
                )}

                <div className="payment-callback-footer">
                    <p>Secure payment powered by <strong>Gumroad</strong></p>
                </div>
            </div>
        </div>
    );
}
