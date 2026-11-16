import React from "react";
import { useTranslation } from "react-i18next";
import "../styles/global.css"; // ensure this is imported

const LoadingSpinner = () => {
  const { t } = useTranslation();

  return (
    <div className="global-loading-overlay show" role="status">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>{t('app.loading')}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
