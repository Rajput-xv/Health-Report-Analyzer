import React, { useState, useEffect } from 'react';
import api from '../utils/api';

// Reports List Component
export const ReportsList = ({ onSelectReport }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports');
            setReports(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load reports');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm('Delete this report?')) {
            try {
                await api.delete(`/reports/${reportId}`);
                setReports(reports.filter(report => report._id !== reportId));
            } catch (err) {
                alert('Failed to delete report');
            }
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading reports...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    }

    if (reports.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No reports found. Upload one to get started.</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px', color: '#1f2937' }}>My Reports</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
                {reports.map((reportItem) => (
                    <div
                        key={reportItem._id}
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '15px',
                            backgroundColor: '#f9fafb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937', marginBottom: '4px' }}>
                                {reportItem.filename}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                {new Date(reportItem.createdAt).toLocaleDateString()} | {reportItem.healthParameters.length} parameters
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Status: <span style={{ fontWeight: '600', color: reportItem.aiInsights?.riskLevel === 'High' ? '#dc2626' : reportItem.aiInsights?.riskLevel === 'Moderate' ? '#f97316' : '#10b981' }}>
                                    {reportItem.aiInsights?.riskLevel || 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => onSelectReport(reportItem._id)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                View
                            </button>
                            <button
                                onClick={() => handleDelete(reportItem._id)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
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
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/reports/${reportId}`);
            setReport(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load report');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading report...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    }

    if (!report) {
        return <div style={{ padding: '20px' }}>Report not found</div>;
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

    const groupedParams = report.healthParameters.reduce((accumulator, param) => {
        const category = param.category || 'Other';
        if (!accumulator[category]) accumulator[category] = [];
        accumulator[category].push(param);
        return accumulator;
    }, {});

    const categories = Object.keys(groupedParams).sort();
    const abnormalParams = report.healthParameters.filter(p => ['High', 'Low', 'Abnormal'].includes(p.status));

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
                ← Back to Reports
            </button>

            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1f2937' }}>Medical Report</h1>
                <p style={{ margin: '0', color: '#000000', fontSize: '14px' }}>
                    {new Date(report.createdAt).toLocaleDateString()} | {report.filename}
                </p>
            </div>

            {report.patientInfo && (
                <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937' }}>Patient Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
                        {report.patientInfo.name && <div><strong>Name:</strong> {report.patientInfo.name}</div>}
                        {report.patientInfo.age && <div><strong>Age:</strong> {report.patientInfo.age}</div>}
                        {report.patientInfo.gender && <div><strong>Gender:</strong> {report.patientInfo.gender}</div>}
                        {report.patientInfo.testDate && <div><strong>Test Date:</strong> {report.patientInfo.testDate}</div>}
                        {report.patientInfo.hospital && <div><strong>Hospital:</strong> {report.patientInfo.hospital}</div>}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>{report.healthParameters.length}</div>
                    <div style={{ fontSize: '12px', color: '#0c4a6e' }}>Total Parameters</div>
                </div>
                {report.aiInsights && (
                    <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '4px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>{report.aiInsights.riskLevel || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#b45309' }}>Risk Level</div>
                    </div>
                )}
            </div>

            {report.aiInsights && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937' }}>AI Insights</h3>

                    {report.aiInsights.summary && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px' }}>Summary:</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#4b5563' }}>{report.aiInsights.summary}</p>
                        </div>
                    )}

                    {report.aiInsights.outliers && report.aiInsights.outliers.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px' }}>Outliers:</strong>
                            <div style={{ marginTop: '8px' }}>
                                {report.aiInsights.outliers.map((outlier, index) => {
                                    const isNumeric = typeof outlier.value === 'number' && outlier.value !== 0;
                                    return (
                                        <div key={index} style={{ backgroundColor: '#fff', padding: '10px', marginBottom: '8px', borderLeft: `3px solid ${outlier.severity === 'Severe' ? '#dc2626' : outlier.severity === 'Moderate' ? '#f97316' : '#eab308'}`, borderRadius: '2px', fontSize: '13px' }}>
                                            <div><strong>{outlier.parameter}</strong></div>
                                            {isNumeric && (
                                                <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    {outlier.value} {outlier.normalRange && `(Normal: ${outlier.normalRange})`}
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
                            <strong style={{ fontSize: '14px' }}>Recommendations:</strong>
                            <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', paddingLeft: '10px' }}>
                                {report.aiInsights.recommendations.map((recommendation, index) => (
                                    <li key={index} style={{ marginBottom: '4px' }}>{recommendation}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.aiInsights.positiveFindings && report.aiInsights.positiveFindings.length > 0 && (
                        <div>
                            <strong style={{ fontSize: '14px' }}>Positive Findings:</strong>
                            <ul style={{ margin: '8px 0 0 20px', fontSize: '13px', color: '#15803d', paddingLeft: '10px' }}>
                                {report.aiInsights.positiveFindings.map((finding, index) => (
                                    <li key={index} style={{ marginBottom: '4px' }}>✓ {finding}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div>
                <h3 style={{ margin: '20px 0 15px 0', fontSize: '16px', color: '#1f2937' }}>Health Parameters</h3>

                {categories.map(category => (
                    <div key={category} style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
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

                                    <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: getStatusColor(param.status) }}>
                                        {param.value} {param.unit}
                                    </div>

                                    <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                                        Normal: {param.normalRange}
                                    </div>

                                    {param.textValue && (
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

            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                <p style={{ margin: '0' }}>
                    Extraction Method: <strong>{report.extractionMethod}</strong> |
                    Processed: {new Date(report.createdAt).toLocaleString()}
                    {report.geminiMetadata && ` | Confidence: ${(report.geminiMetadata.confidence * 100).toFixed(0)}%`}
                </p>
            </div>
        </div>
    );
};