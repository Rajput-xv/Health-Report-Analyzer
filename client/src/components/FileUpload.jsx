import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../context/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../utils/api";
import { toast } from "react-toastify";
import AOS from "aos";

const FileUpload = ({ onFileProcessed, onError }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [ocrProgress, setOcrProgress] = useState(0);
    const { subscription, fetchSubscription } = useSubscription();
    const ocrTimerRef = useRef(null);
    const fileInputRef = useRef(null);
    const isAtLimit = subscription?.canUpload === false;
    const disabled = isAtLimit || uploading;

    //Reset state helper
    const resetProgress = () => {
        setUploading(false);
        setUploadProgress(0);
        setOcrProgress(0);
        if (ocrTimerRef.current) {
            clearInterval(ocrTimerRef.current);
        }
    };

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
        if (disabled) return;
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileUpload(files[0]);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        e.target.value = "";
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

        setUploading(true);
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

        try {
            const result = await uploadFile(file, setUploadProgress);
            onFileProcessed(result);
            fetchSubscription();
            if (result.isScannedDocument) {
                toast.info(
                    t(
                        result.requiresManualEntry
                            ? "file_upload.scanned_manual"
                            : "file_upload.scanned_verify",
                    ),
                );
            }
        } catch (error) {
            console.error("File upload error:", error);
            const status = error.response?.status;
            const serverError = error.response?.data?.error;

            if (status === 403 && error.response.data?.upgradeRequired) {
                fetchSubscription();
                onError(t("file_upload.error_upgrade"));
            } else if (serverError?.includes("No text could be extracted")) {
                onError(t("file_upload.error_no_text"));
            } else if (serverError?.includes("No health parameters found")) {
                onError(t("file_upload.error_no_parameters"));
            } else if (error.code === "ECONNABORTED") {
                onError(t("file_upload.error_timeout"));
            } else if (!error.response) {
                onError(t("file_upload.error_network"));
            } else if (status === 413) {
                onError(t("file_upload.error_413"));
            } else if (status === 415) {
                onError(t("file_upload.error_415"));
            } else if (status >= 500) {
                onError(t("file_upload.error_server"));
            } else {
                onError(serverError || t("file_upload.error_generic"));
            }
        } finally {
            resetProgress();
        }
    };

    const openFileDialog = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    // Handle keyboard activation (Enter or Space)
    const handleKeyPress = (e) => {
        if (disabled) return;
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
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-disabled={disabled}
                aria-busy={uploading}
                aria-label={t("file_upload.aria_label")}
            >
                <div className="upload-icon">📄</div>
                <h3>{t("file_upload.heading")}</h3>
                <p>{t("file_upload.subtext")}</p>
                <p className="file-types">{t("file_upload.supported")}</p>

                {uploading && uploadProgress < 100 && (
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

                {uploading && uploadProgress === 100 && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${ocrProgress}%` }}
                            ></div>
                        </div>
                        <span>{t("file_upload.ocr_analyzing")}</span>
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
