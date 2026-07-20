import React from "react";
import { useTranslation } from "react-i18next";
import { useLoading } from "../context/LoadingContext";
import "../styles/global.css"; // ensure this is imported

const LoadingSpinner = () => {
  const { isLoading: loading } = useLoading();
  const { t } = useTranslation();

  return (
    <div className={`global-loading-overlay ${loading ? "show" : ""}`}>
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-text">
          <h3>{t('loading.title')}</h3>
          <p>{t('loading.subtitle')}</p>
          <div className="loading-steps">
            <div className="step">{t('loading.step_1')}</div>
            <div className="step">{t('loading.step_2')}</div>
            <div className="step">{t('loading.step_3')}</div>
            <div className="step">{t('loading.step_4')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
