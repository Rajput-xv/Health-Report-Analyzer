import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "../utils/api";
import Header from "./Header";
import FileUpload from "./FileUpload";
import { ReportsList, ReportDetail } from "./ReportList";
import FAQ from "./FAQ";
import Footer from "./Footer";

export default function Dashboard({ user, setUser }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [uploadedReportId, setUploadedReportId] = useState(null);
    const [viewingReportId, setViewingReportId] = useState(null);
    const [error, setError] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState(null);

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

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setUploadedReportId(null);
        setViewingReportId(null);
        toast.error(t("toast.upload_error"));
    };

    const handleReset = () => {
        setUploadedReportId(null);
        setViewingReportId(null);
        setError(null);
    };

    return (
        <div className="app">
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
                        <div className="welcome-dashboard-message">
                            <h2>
                                {t("app.welcome")}, {user.firstName}!
                            </h2>
                            <p>{t("dashboard.upload_first")}</p>
                        </div>

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
