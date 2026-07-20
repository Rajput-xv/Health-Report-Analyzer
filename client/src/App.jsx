import BackToTopButton from "./components/BackToTopButton";
import "./styles/BackToTopButton.css";
import React, { useState, useEffect, lazy, Suspense } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { refreshAnimations, checkPerformance } from "./utils/animationUtils";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import LoadingSpinner from "./components/LoadingSpinner";
import LandingPage from "./components/LandingPage";
import Footer from "./components/Footer";
import FileUpload from "./components/FileUpload";
import { getCurrentUser } from "./utils/api";
import "./styles/App.css";
import FAQ from "./components/FAQ";
import { useLoading } from "./context/LoadingContext.jsx";
import { SubscriptionProvider } from "./context/SubscriptionContext.jsx";
import { ReportsList, ReportDetail } from "./components/ReportList";
import Stats from "./components/Stats";
import Header from "./components/Header";
import AnalyticsTracker from "./AnalyticsTracker";

// Loaded on demand so they stay out of the initial (landing-page) bundle.
const AuthForm = lazy(() => import("./components/AuthForm"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const ResetPassword = lazy(() => import("./components/ResetPassword"));
const ContactUs = lazy(() => import("./components/ContactUs"));
const PricingPage = lazy(() => import("./components/PricingPage"));
const PaymentCallback = lazy(() => import("./components/PaymentCallback"));
const NotFoundPage = lazy(() => import("./components/NotFoundPage"));
const HealthInsights = lazy(() => import("./components/HealthInsights"));

function Dashboard({ user, setUser }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [uploadedReportId, setUploadedReportId] = useState(null);
    const [viewingReportId, setViewingReportId] = useState(null);
    const [trendData, setTrendData] = useState(null);
    const [error, setError] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState(null);

    const { loading } = useLoading();

    // Check for payment success/cancelled in URL and refresh user data
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const paymentStatus = params.get("payment");

        const refreshUserData = async () => {
            try {
                // Fetch fresh user data to get updated subscription
                const response = await getCurrentUser();
                const updatedUser = response.user || response;

                // Update user in localStorage and state
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);

                console.log("✅ User data refreshed after payment");
            } catch (error) {
                console.error("Failed to refresh user data:", error);
            }
        };

        if (paymentStatus === "success") {
            setPaymentMessage({
                type: "success",
                text: t("payment.banner_success"),
            });
            toast.success(t("payment.banner_toast_success"));

            // Refresh user data to show updated subscription
            refreshUserData();

            // Clear the URL parameter after a short delay
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 100);
        } else if (paymentStatus === "cancelled") {
            setPaymentMessage({
                type: "info",
                text: t("payment.banner_cancelled"),
            });
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 100);
        }
    }, [location.search, navigate, setUser, t]);

    const handleFileProcessed = (data) => {
        setUploadedReportId(data.reportId || data._id);
        setViewingReportId(data.reportId || data._id);
        setError(null);
        toast.success(t("toast.upload_success"));
    };

    const handleTrendData = (trends) => {
        setTrendData(trends);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setUploadedReportId(null);
        setViewingReportId(null);
        setTrendData(null);
        toast.error(t("toast.upload_error"));
    };

    const handleReset = () => {
        setUploadedReportId(null);
        setViewingReportId(null);
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

            <Header user={user} setUser={setUser} />

            <main className="app-main">
                {/* Payment Success/Cancelled Message */}
                {paymentMessage && (
                    <div
                        className={`payment-message ${paymentMessage.type}`}
                        style={{
                            padding: "1rem 1.5rem",
                            marginBottom: "1.5rem",
                            borderRadius: "12px",
                            backgroundColor:
                                paymentMessage.type === "success"
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : "rgba(59, 130, 246, 0.1)",
                            border: `1px solid ${paymentMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                            color:
                                paymentMessage.type === "success"
                                    ? "#16a34a"
                                    : "#2563eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.95rem",
                        }}
                    >
                        <span>{paymentMessage.text}</span>
                        <button
                            onClick={() => setPaymentMessage(null)}
                            aria-label={t('common.close')}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                opacity: 0.7,
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                        <button
                            onClick={handleReset}
                            className="btn-retry"
                            tabIndex={0}
                        >
                            {t("app.try_again")}
                        </button>
                    </div>
                )}

                {/* Viewing a specific report */}
                {viewingReportId && (
                    <div>
                        <ReportDetail
                            reportId={viewingReportId}
                            onBack={handleReset}
                        />
                    </div>
                )}

                {/* Viewing reports list */}
                {!viewingReportId && !uploadedReportId && (
                    <>
                        {!loading && (
                            <div className="welcome-dashboard-message">
                                <h2>
                                    {t("app.welcome")}, {user.firstName}!
                                </h2>
                                <p>{t("dashboard.upload_first")}</p>
                            </div>
                        )}

                        <FileUpload
                            onFileProcessed={handleFileProcessed}
                            onError={handleError}
                        />

                        <ReportsList onSelectReport={setViewingReportId} />
                    </>
                )}
            </main>

            <div>
                <FAQ />
            </div>
            <div>
                <Footer />
            </div>
        </div>
    );
}

// Contact Page Component - now uses shared Header
function ContactPage({ user, setUser }) {
    return (
        <>
            <Header user={user} setUser={setUser} />
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
    const { t, i18n, ready } = useTranslation();
    const { loading } = useLoading();
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Initialize AOS for scroll animations with improved handling
    useEffect(() => {
        // Detect mobile to skip complex animations
        const isMobile = window.innerWidth < 768;

        if (!isMobile) {
            // Only check performance and add listeners on desktop
            checkPerformance();

            // Refresh animations on window resize with debounce for performance
            const handleResize = () => {
                refreshAnimations();
            };

            window.addEventListener("resize", handleResize);
            window.addEventListener("orientationchange", handleResize);

            // Initial refresh
            refreshAnimations();

            return () => {
                window.removeEventListener("resize", handleResize);
                window.removeEventListener("orientationchange", handleResize);
            };
        }
    }, []);

    // Route-change animation refresh is handled by <RouteChangeTracker/> below.

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token || !userData) {
            setAuthLoading(false);
            return;
        }

        let parsedUser = null;
        try {
            parsedUser = JSON.parse(userData);
        } catch (parseErr) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setAuthLoading(false);
            return;
        }

        // Render the app immediately from the stored session - don't block the first
        // paint on the network. (The backend can cold-start and take a while.)
        setUser(parsedUser);
        setAuthLoading(false);

        // Confirm the session with the server in the background; only a real 401 logs out.
        getCurrentUser().catch((error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
            }
        });
        // Run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.documentElement.lang = i18n.language || "en";
        document.title = t("app.title");
    }, [i18n.language, t]);

    useEffect(() => {
        const handleLanguageChange = (lng) => {
            document.documentElement.lang = lng;
            document.title = t("app.title");
            document.documentElement.dir =
                lng === "ar" || lng === "he" ? "rtl" : "ltr";
        };

        i18n.on("languageChanged", handleLanguageChange);

        return () => {
            i18n.off("languageChanged", handleLanguageChange);
        };
    }, [i18n, t]);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    // Show loading screen if translations not ready or auth is loading
    if (!ready || authLoading || loading) {
        return (
            <div className="app">
                <div className="global-loading-overlay">
                    <LoadingSpinner />
                    <p>{t("app.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <SubscriptionProvider>
            <Router>
                <AnalyticsTracker />
                <RouteChangeTracker />
                <div className="app">
                    <Suspense
                        fallback={
                            <div className="global-loading-overlay">
                                <LoadingSpinner />
                            </div>
                        }
                    >
                        <Routes>
                            {/* Landing page */}
                            <Route
                                path="/"
                                element={
                                    <>
                                        <LandingPage
                                            user={user}
                                            setUser={setUser}
                                        />
                                        <Stats />
                                        <FAQ />
                                        <Footer />
                                    </>
                                }
                            />

                            {/* Landing page - default route for non-authenticated users */}
                            <Route
                                path="/home"
                                element={
                                    user ? (
                                        <Navigate to="/dashboard" />
                                    ) : (
                                        <Navigate to="/" />
                                    )
                                }
                            />

                            {/* Login - AuthForm has its own responsive header */}
                            <Route
                                path="/login"
                                element={
                                    user ? (
                                        <Navigate to="/dashboard" />
                                    ) : (
                                        <>
                                            <AuthForm
                                                onLogin={handleLogin}
                                                isLogin={true}
                                            />
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
                                            <AuthForm
                                                onLogin={handleLogin}
                                                isLogin={false}
                                            />
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
                                    <ContactPage
                                        user={user}
                                        setUser={setUser}
                                    />
                                }
                            />

                            {/* Pricing Page - accessible to all */}
                            <Route
                                path="/pricing"
                                element={
                                    <>
                                        <Header user={user} setUser={setUser} />
                                        <PricingPage user={user} />
                                        <Footer />
                                    </>
                                }
                            />

                            {/* Payment Callback - handles redirect from Gumroad */}
                            <Route
                                path="/payment-callback"
                                element={
                                    user ? (
                                        <PaymentCallback />
                                    ) : (
                                        <Navigate
                                            to="/login?redirect=/payment-callback"
                                            replace
                                        />
                                    )
                                }
                            />

                            {/* Legacy Gumroad Callback - redirect to new handler */}
                            <Route
                                path="/callback"
                                element={
                                    user ? (
                                        <PaymentCallback />
                                    ) : (
                                        <Navigate
                                            to="/login?redirect=/payment-callback"
                                            replace
                                        />
                                    )
                                }
                            />

                            {/* Dashboard */}
                            <Route
                                path="/dashboard"
                                element={
                                    user ? (
                                        <Dashboard
                                            user={user}
                                            setUser={setUser}
                                        />
                                    ) : (
                                        <Navigate to="/login" />
                                    )
                                }
                            />

                            {/* Health Insights & Analysis */}
                            <Route
                                path="/insights"
                                element={
                                    user ? (
                                        <HealthInsights
                                            user={user}
                                            setUser={setUser}
                                        />
                                    ) : (
                                        <Navigate to="/login" />
                                    )
                                }
                            />

                            {/* Catch all - 404 Page */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Suspense>

                    <ToastContainer
                        position="top-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={i18n.language === "ar" || i18n.language === "he"}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                    />

                    <BackToTopButton />
                </div>
            </Router>
        </SubscriptionProvider>
    );
}

export default App;
