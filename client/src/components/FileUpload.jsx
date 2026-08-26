import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../context/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../utils/api";
import api from "../utils/api";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";
import AOS from "aos";

const FileUpload = ({ onFileProcessed, onError }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingOcr, setProcessingOcr] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const { subscription, fetchSubscription } = useSubscription();
    const ocrTimerRef = useRef(null);
    const fileInputRef = useRef(null);

    //Reset state helper
    const resetProgress = () => {
        setUploadProgress(0);
        setProcessingOcr(false);
        setOcrProgress(0);
        if (ocrTimerRef.current) {
            clearInterval(ocrTimerRef.current);
        }
    };

    const { showLoading, hideLoading } = useLoading();

    // Fetch subscription status
    useEffect(() => {
        fetchSubscription();
        // eslint-disable-next-line
    }, []);

    // Clean up the timer when component unmounts
    useEffect(() => {
        AOS.refresh();
        return () => resetProgress(); //ensure cleanup
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileUpload(files[0]);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
    };

    const handleFileUpload = async (file) => {
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
        ];
        if (!allowedTypes.includes(file.type)) {
            onError(t("file_upload.error_invalid_type"));
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            onError(t("file_upload.error_too_large"));
            return;
        }

        try {
            // showLoading();
            setUploadProgress(0);

            if (
                file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
            ) {
                setProcessingOcr(true);
                setOcrProgress(0);

                if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);

                ocrTimerRef.current = setInterval(() => {
                    setOcrProgress((prev) => {
                        if (prev >= 95) return 95;
                        const increment =
                            prev < 20
                                ? 0.8
                                : prev < 40
                                  ? 0.5
                                  : prev < 60
                                    ? 0.3
                                    : prev < 80
                                      ? 0.2
                                      : 0.1;
                        return prev + increment;
                    });
                }, 1000);
            }

            const result = await uploadFile(file, (progress) => {
                if (!processingOcr) setUploadProgress(progress);
            });

            if (ocrTimerRef.current) {
                clearInterval(ocrTimerRef.current);
                setOcrProgress(100);
            }

            // hideLoading();
            if (result.isScannedDocument) {
                // The report WAS created - don't route through onError (that wipes the
                // report view and fires a false error toast). Just nudge the user to verify.
                onFileProcessed(result);
                await fetchSubscription();
                toast.info(
                    t(
                        result.requiresManualEntry
                            ? "file_upload.scanned_manual"
                            : "file_upload.scanned_verify",
                    ),
                );
            } else {
                onFileProcessed(result);
                await fetchSubscription();
            }
        } catch (error) {
            console.error("File upload error:", error);
            if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);

            if (error.message?.includes("No text could be extracted")) {
                onError(t("file_upload.error_no_text"));
            } else if (error.message?.includes("No health parameters found")) {
                onError(t("file_upload.error_no_parameters"));
            } else if (
                error.message?.includes("timeout") ||
                error.code === "ECONNABORTED"
            ) {
                onError(t("file_upload.error_timeout"));
            } else if (
                error.message?.includes("Network Error") ||
                !navigator.onLine
            ) {
                onError(t("file_upload.error_network"));
            } else if (error.response?.status === 413) {
                onError(t("file_upload.error_413"));
            } else if (error.response?.status === 415) {
                onError(t("file_upload.error_415"));
            } else if (
                error.response?.status === 403 &&
                error.response?.data?.upgradeRequired
            ) {
                onError(
                    t("file_upload.error_upgrade", {
                        message: error.response.data.message,
                    }),
                );
            } else if (error.response?.status >= 500) {
                onError(t("file_upload.error_server"));
            } else {
                onError(error.message || t("file_upload.error_generic"));
            }
        } finally {
            // hideLoading();
            resetProgress();
        }
    };

    // Free plan at its report limit: block the picker (mouse + keyboard) and mark disabled.
    const isAtLimit =
        subscription?.plan === "free" &&
        subscription?.reportsUsed >= subscription?.reportsLimit;

    const openFileDialog = () => {
        if (isAtLimit) return;
        fileInputRef.current?.click();
    };

    // Handle keyboard activation (Enter or Space)
    const handleKeyPress = (e) => {
        if (isAtLimit) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFileDialog();
        }
    };

    return (
        <div className="file-upload-container">
            {/* Subscription Status Indicator */}
            {subscription && (
                <div
                    className={`upload-quota-indicator ${subscription.plan !== "free" ? "pro" : subscription.reportsUsed >= subscription.reportsLimit ? "limit-reached" : ""}`}
                >
                    {subscription.plan === "pro_yearly" ? (
                        <div className="quota-content">
                            <span className="quota-icon">👑</span>
                            <span className="quota-text">
                                {t("file_upload.quota_pro_yearly")}
                            </span>
                        </div>
                    ) : subscription.plan === "pro_monthly" ? (
                        <div className="quota-content">
                            <span className="quota-icon">⭐</span>
                            <span className="quota-text">
                                {t("file_upload.quota_remaining", {
                                    remaining:
                                        subscription.reportsLimit -
                                        subscription.reportsUsed,
                                    limit: subscription.reportsLimit,
                                })}
                            </span>
                            {subscription.reportsLimit -
                                subscription.reportsUsed <=
                                2 && (
                                <button
                                    className="upgrade-cta-btn subtle"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/pricing");
                                    }}
                                >
                                    {t("file_upload.upgrade_yearly")}
                                </button>
                            )}
                        </div>
                    ) : subscription.reportsUsed >=
                      subscription.reportsLimit ? (
                        <div className="quota-content limit-reached">
                            <span className="quota-icon">⚠️</span>
                            <span className="quota-text">
                                {t("file_upload.quota_limit_reached", {
                                    used: subscription.reportsUsed,
                                    limit: subscription.reportsLimit,
                                })}
                            </span>
                            <button
                                className="upgrade-cta-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/pricing");
                                }}
                            >
                                {t("file_upload.upgrade_pro")}
                            </button>
                        </div>
                    ) : (
                        <div className="quota-content">
                            <span className="quota-icon">📊</span>
                            <span className="quota-text">
                                {t("file_upload.quota_remaining", {
                                    remaining:
                                        subscription.reportsLimit -
                                        subscription.reportsUsed,
                                    limit: subscription.reportsLimit,
                                })}
                            </span>
                            {subscription.reportsLimit -
                                subscription.reportsUsed <=
                                1 && (
                                <button
                                    className="upgrade-cta-btn subtle"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/pricing");
                                    }}
                                >
                                    {t("file_upload.get_unlimited")}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div
                className={`file-upload-area ${isDragOver ? "drag-over" : ""} ${isAtLimit ? "disabled" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFileDialog}
                onKeyDown={handleKeyPress}
                tabIndex={isAtLimit ? -1 : 0}
                role="button"
                aria-disabled={isAtLimit}
                aria-label={t("file_upload.aria_label")}
            >
                <div className="upload-icon">📄</div>
                <h3>{t("file_upload.heading")}</h3>
                <p>{t("file_upload.subtext")}</p>
                <p className="file-types">{t("file_upload.supported")}</p>

                {uploadProgress > 0 && !processingOcr && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <span>
                            {t("file_upload.percent_uploaded", {
                                percent: uploadProgress,
                            })}
                        </span>
                    </div>
                )}

                {processingOcr && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${ocrProgress}%` }}
                            ></div>
                        </div>
                        <span>
                            {ocrProgress < 100
                                ? t("file_upload.ocr_analyzing")
                                : t("file_upload.ocr_complete")}
                        </span>
                        <p className="ocr-note">{t("file_upload.ocr_note")}</p>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: "none" }}
            />

            <div
                className="upload-tips"
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <h4 data-aos="fade-right" data-aos-delay="500">
                    {t("file_upload.tips_title")}
                </h4>
                <ul data-aos="fade-up" data-aos-delay="600">
                    <li>{t("file_upload.tip_1")}</li>
                    <li>{t("file_upload.tip_2")}</li>
                    <li>{t("file_upload.tip_3")}</li>
                    <li>{t("file_upload.tip_4")}</li>
                </ul>
            </div>
        </div>
    );
};

export default FileUpload;
