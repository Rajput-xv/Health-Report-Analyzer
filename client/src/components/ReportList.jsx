import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api, { fetchTrendData, regenerateInsights } from '../utils/api';
import TrendChart from './TrendChart';
import '../styles/ReportList.css';

export const ReportsList = ({ onSelectReport }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/reports');
            setReports(response.data);
        } catch (err) {
            setError(t('reports_detail.load_reports_error'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm(t('reports_detail.confirm_delete'))) {
            try {
                await api.delete(`/reports/${reportId}`);
                setReports(reports.filter(report => report._id !== reportId));
            } catch (err) {
                alert(t('reports_detail.delete_error'));
            }
        }
    };

    // Loading skeleton (simplified for brevity, can also be moved to CSS or kept as is if complex)
    if (loading) {
        return (
            <div className="reports-container">
                <h2 className="reports-title" style={{ marginBottom: '20px' }}>{t('reports_detail.my_reports')}</h2>
                <div className="reports-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '20px',
                            backgroundColor: '#f9fafb',
                            height: '100px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}></div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                margin: '20px 0'
            }}>
                <h3 className="reports-error-title">{error}</h3>
                <button onClick={fetchReports} className="btn-delete" style={{ marginTop: '10px' }}>{t('app.try_again')}</button>
            </div>
        );
    }

    // Empty state
    if (reports.length === 0) {
        return (
            <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.03) 100%)',
                borderRadius: '20px',
                border: '1px dashed rgba(102, 126, 234, 0.3)',
                margin: '20px 0'
            }}>
                <h3 className="reports-empty-title" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{t('reports_detail.no_reports_title')}</h3>
                <p className="reports-empty-text" style={{ marginBottom: '1.5rem' }}>{t('reports_detail.no_reports_text')}</p>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} // Assuming upload is at top
                    className="btn-view"
                    style={{ borderRadius: '50px', padding: '12px 24px', fontSize: '1rem' }}
                >
                    {t('reports_detail.upload_report')}
                </button>
            </div>
        );
    }

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h2 className="reports-title">
                    {t('reports_detail.my_reports')}
                    <span className="report-count-badge">
                        {reports.length}
                    </span>
                </h2>
            </div>
            <div className="reports-grid">
                {reports.map((reportItem) => (
                    <div
                        key={reportItem._id}
                        className="report-card"
                        onClick={() => onSelectReport(reportItem._id)}
                    >
                        <div className="report-info">
                            <div className="report-filename">
                                {reportItem.filename}
                            </div>
                            <div className="report-meta">
                                📅 {new Date(reportItem.createdAt).toLocaleDateString()} • 📊 {t('reports_detail.parameters_count', { count: reportItem.healthParameters?.length || 0 })}
                            </div>
                            <div>
                                <span
                                    className="report-status-badge"
                                    style={{
                                        backgroundColor: reportItem.aiInsights?.riskLevel === 'High' ? 'rgba(220, 38, 38, 0.1)' :
                                            reportItem.aiInsights?.riskLevel === 'Moderate' ? 'rgba(249, 115, 22, 0.1)' :
                                                'rgba(16, 185, 129, 0.1)',
                                        color: reportItem.aiInsights?.riskLevel === 'High' ? '#dc2626' :
                                            reportItem.aiInsights?.riskLevel === 'Moderate' ? '#f97316' : '#10b981'
                                    }}
                                >
                                    {reportItem.aiInsights?.riskLevel === 'High' ? '⚠️' :
                                        reportItem.aiInsights?.riskLevel === 'Moderate' ? '⚡' : '✓'}
                                    {' '}{reportItem.aiInsights?.riskLevel || t('reports_detail.status_analyzed')}
                                </span>
                            </div>
                        </div>
                        <div className="report-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => onSelectReport(reportItem._id)}
                                className="btn-view"
                            >
                                {t('reports_detail.view')}
                            </button>
                            <button
                                onClick={() => handleDelete(reportItem._id)}
                                className="btn-delete"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Report Detail Component
export const ReportDetail = ({ reportId, onBack }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trends, setTrends] = useState(null);
    const [regenerating, setRegenerating] = useState(false);

    useEffect(() => {
        fetchReport();
        loadTrends();
    }, [reportId]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/reports/${reportId}`);
            setReport(response.data);
            setError(null);
        } catch (err) {
            setError(t('reports_detail.load_report_error'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTrends = async () => {
        const data = await fetchTrendData(reportId);
        // fetchTrendData returns the trend map on success, or an error object on failure
        if (data && !data.error && typeof data === 'object') {
            setTrends(data);
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const result = await regenerateInsights(reportId);
            if (result.success && result.insights) {
                setReport((prev) => ({ ...prev, aiInsights: result.insights }));
                toast.success(t('reports_detail.insights_regenerated'));
            } else {
                toast.error(result.error || t('reports_detail.insights_error'));
            }
        } catch (err) {
            toast.error(t('reports_detail.insights_error'));
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return <div className="report-state-text" style={{ padding: '20px', textAlign: 'center' }}>{t('reports_detail.loading')}</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    }

    if (!report) {
        return <div className="report-state-text" style={{ padding: '20px' }}>{t('reports_detail.not_found')}</div>;
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Normal': return '#10b981';
            case 'High': return '#ef4444';
            case 'Low': return '#f97316';
            case 'Abnormal': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case 'Normal': return '#f0fdf4';
            case 'High':
            case 'Abnormal': return '#fef2f2';
            case 'Low': return '#fff7ed';
            default: return '#f9fafb';
        }
    };

    const healthParameters = report.healthParameters || [];
    const groupedParams = healthParameters.reduce((accumulator, param) => {
        const category = param.category || 'Other';
        if (!accumulator[category]) accumulator[category] = [];
        accumulator[category].push(param);
        return accumulator;
    }, {});

    const categories = Object.keys(groupedParams).sort();
    const abnormalParams = healthParameters.filter(p => ['High', 'Low', 'Abnormal'].includes(p.status));

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <button
                onClick={onBack}
                style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    backgroundColor: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px'
                }}
            >
                ← {t('reports_detail.back')}
            </button>

            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
                <h1 className="report-detail-title" style={{ margin: '0 0 10px 0', fontSize: '28px' }}>{t('reports_detail.medical_report')}</h1>
                <p className="report-detail-subtitle" style={{ margin: '0', fontSize: '14px' }}>
                    {new Date(report.createdAt).toLocaleDateString()} | {report.filename}
                </p>
            </div>

            {report.patientInfo && (
                <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937' }}>{t('reports_detail.patient_info')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
                        {report.patientInfo.name && <div><strong>{t('reports_detail.label_name')}:</strong> {report.patientInfo.name}</div>}
                        {report.patientInfo.age && <div><strong>{t('reports_detail.label_age')}:</strong> {report.patientInfo.age}</div>}
                        {report.patientInfo.gender && <div><strong>{t('reports_detail.label_gender')}:</strong> {report.patientInfo.gender}</div>}
                        {report.patientInfo.testDate && <div><strong>{t('reports_detail.label_test_date')}:</strong> {report.patientInfo.testDate}</div>}
                        {report.patientInfo.hospital && <div><strong>{t('reports_detail.label_hospital')}:</strong> {report.patientInfo.hospital}</div>}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>{healthParameters.length}</div>
                    <div style={{ fontSize: '12px', color: '#0c4a6e' }}>{t('reports_detail.total_parameters')}</div>
                </div>
                {report.aiInsights && (
                    <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>{report.aiInsights.riskLevel || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#b45309' }}>{t('reports_detail.risk_level')}</div>
                    </div>
                )}
            </div>

            {report.aiInsights && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>{t('reports_detail.ai_insights')}</h3>
                        <button
                            onClick={handleRegenerate}
                            disabled={regenerating}
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '6px', cursor: regenerating ? 'not-allowed' : 'pointer', opacity: regenerating ? 0.7 : 1 }}
                        >
                            {regenerating ? t('reports_detail.regenerating') : t('reports_detail.regenerate')}
                        </button>
                    </div>

                    {report.aiInsights.summary && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px' }}>{t('reports_detail.summary')}:</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#4b5563' }}>{report.aiInsights.summary}</p>
                        </div>
                    )}

                    {report.aiInsights.outliers && report.aiInsights.outliers.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px' }}>{t('reports_detail.outliers')}:</strong>
                            <div style={{ marginTop: '8px' }}>
                                {report.aiInsights.outliers.map((outlier, index) => {
                                    const isNumeric = typeof outlier.value === 'number' && outlier.value !== 0;
                                    return (
                                        <div key={index} style={{ backgroundColor: '#fff', padding: '10px', marginBottom: '8px', borderLeft: `3px solid ${outlier.severity === 'Severe' ? '#dc2626' : outlier.severity === 'Moderate' ? '#f97316' : '#eab308'}`, borderRadius: '2px', fontSize: '13px' }}>
                                            <div><strong>{outlier.parameter}</strong></div>
                                            {isNumeric && (
                                                <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    {outlier.value} {outlier.normalRange && `(${t('reports_detail.normal_label')}: ${outlier.normalRange})`}
                                                </div>
                                            )}
                                            <div style={{ color: '#6b7280' }}>{outlier.concern}</div>
                                            {outlier.recommendation && <div style={{ marginTop: '6px', fontWeight: '500' }}>→ {outlier.recommendation}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {report.aiInsights.recommendations && report.aiInsights.recommendations.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px' }}>{t('reports_detail.recommendations')}:</strong>
                            <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', paddingLeft: '10px' }}>
                                {report.aiInsights.recommendations.map((recommendation, index) => (
                                    <li key={index} style={{ marginBottom: '4px' }}>{recommendation}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.aiInsights.positiveFindings && report.aiInsights.positiveFindings.length > 0 && (
                        <div>
                            <strong style={{ fontSize: '14px' }}>{t('reports_detail.positive_findings')}:</strong>
                            <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', color: '#15803d', paddingLeft: '10px' }}>
                                {report.aiInsights.positiveFindings.map((finding, index) => (
                                    <li key={index} style={{ marginBottom: '4px' }}>✓ {finding}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {!report.aiInsights && healthParameters.length > 0 && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '15px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#92400e' }}>{t('reports_detail.no_insights')}</p>
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '6px', cursor: regenerating ? 'not-allowed' : 'pointer', opacity: regenerating ? 0.7 : 1 }}
                    >
                        {regenerating ? t('reports_detail.regenerating') : t('reports_detail.generate_insights')}
                    </button>
                </div>
            )}

            <div>
                <h3 className="report-section-title" style={{ margin: '20px 0 15px 0', fontSize: '16px' }}>{t('reports_detail.health_parameters')}</h3>

                {categories.map(category => (
                    <div key={category} style={{ marginBottom: '20px' }}>
                        <h4 className="report-category-title" style={{ margin: '0 0 10px 0', fontSize: '14px', paddingBottom: '8px' }}>
                            {category}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {groupedParams[category].map((param, paramIndex) => (
                                <div
                                    key={paramIndex}
                                    style={{
                                        backgroundColor: getStatusBg(param.status),
                                        border: `1px solid ${getStatusColor(param.status)}`,
                                        borderRadius: '4px',
                                        padding: '12px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{param.name}</div>
                                        <div style={{ backgroundColor: getStatusColor(param.status), color: '#fff', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                                            {param.status}
                                        </div>
                                    </div>

                                    {/* Display value based on parameterType */}
                                    {param.parameterType === 'numeric' || (!param.parameterType && typeof param.value === 'number' && param.value !== 0) ? (
                                        <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: getStatusColor(param.status) }}>
                                            {param.value} {param.unit}
                                        </div>
                                    ) : param.textValue ? (
                                        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                            {param.textValue}
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: getStatusColor(param.status) }}>
                                            {param.value} {param.unit}
                                        </div>
                                    )}

                                    {param.normalRange && param.normalRange !== 'N/A' && (
                                        <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                                            {t('reports_detail.normal_label')}: {param.normalRange}
                                        </div>
                                    )}

                                    {/* Show textValue as additional note for numeric params if present */}
                                    {param.parameterType === 'numeric' && param.textValue && (
                                        <div style={{ color: '#4b5563', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>
                                            {param.textValue}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {trends && Object.keys(trends).length > 0 && (
                <div style={{ marginTop: '24px' }}>
                    <TrendChart data={trends} reportId={reportId} />
                </div>
            )}

            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                <p style={{ margin: '0' }}>
                    {/* Extraction Method: <strong>{report.extractionMethod}</strong> | */}
                    {t('reports_detail.processed')}: {new Date(report.createdAt).toLocaleString()}
                    {report.geminiMetadata && ` | ${t('reports_detail.confidence')}: ${(report.geminiMetadata.confidence * 100).toFixed(0)}%`}
                </p>
            </div>
        </div>
    );
};