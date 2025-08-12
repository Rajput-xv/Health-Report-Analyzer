import React, { useState, useEffect } from 'react';
import { fetchTrendData } from '../utils/api';

const ReportTable = ({ data, onTrendData }) => {
  const [sortBy, setSortBy] = useState('category');
  const [filterBy, setFilterBy] = useState('all');
  const [showTrends, setShowTrends] = useState(false);

  const { healthParameters } = data;

  useEffect(() => {
    if (showTrends && data.reportId) {
      loadTrendData();
    }
  }, [showTrends, data.reportId]);

  const loadTrendData = async () => {
    try {
      const trends = await fetchTrendData(data.reportId);
      onTrendData(trends);
    } catch (error) {
      // Trend data loading failed silently
    }
  };

  const handleToggleTrends = () => {
    const newShowTrends = !showTrends;
    setShowTrends(newShowTrends);
    
    // Clear trend data when hiding trends
    if (!newShowTrends) {
      onTrendData(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Normal': return '✅';
      case 'High': return '⚠️';
      case 'Low': return '🔻';
      default: return '❓';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Normal': return 'status-normal';
      case 'High': return 'status-high';
      case 'Low': return 'status-low';
      default: return 'status-unknown';
    }
  };

  const filteredAndSortedData = healthParameters
    .filter(param => {
      if (filterBy === 'all') return true;
      if (filterBy === 'abnormal') return param.status !== 'Normal';
      return param.status.toLowerCase() === filterBy;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const groupedByCategory = filteredAndSortedData.reduce((groups, param) => {
    const category = param.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(param);
    return groups;
  }, {});

  const abnormalCount = healthParameters.filter(p => p.status !== 'Normal').length;
  const unknownCount = healthParameters.filter(p => p.status === 'UNKNOWN').length;


return (
  <div className="report-table-container">
    <div className="table-header">
      <div className="table-summary" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div 
          className="summary-card" 
          style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '10px 16px', borderRadius: 8, flex: '1 1 150px', textAlign: 'center' }}
        >
          <span className="summary-number" style={{ fontSize: 24 }}>📊 {healthParameters.length}</span>
          <br />
          <span className="summary-label" style={{ fontWeight: '600' }}>Total Parameters</span>
        </div>

        <div 
          className="summary-card normal" 
          style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, flex: '1 1 150px', textAlign: 'center' }}
        >
          <span className="summary-number" style={{ fontSize: 24 }}>✅ {healthParameters.length - abnormalCount - unknownCount}</span>
          <br />
          <span className="summary-label" style={{ fontWeight: '600' }}>Normal</span>
        </div>

        <div 
          className="summary-card abnormal" 
          style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 16px', borderRadius: 8, flex: '1 1 150px', textAlign: 'center' }}
        >
          <span className="summary-number" style={{ fontSize: 24 }}>⚠️ {abnormalCount}</span>
          <br />
          <span className="summary-label" style={{ fontWeight: '600' }}>Needs Attention</span>
        </div>

        <div
          className="summary-card unknown"
          title="Data Unavailable: Parameter value missing or incomplete in the report"
          style={{ backgroundColor: '#fff7cd', color: '#92400e', padding: '10px 16px', borderRadius: 8, flex: '1 1 150px', textAlign: 'center' }}
        >
          <span className="summary-number" style={{ fontSize: 24 }}>❓ {unknownCount}</span>
          <br />
          <span className="summary-label" style={{ fontWeight: '600' }}>Data Unavailable</span>
        </div>
      </div>

      <div className="table-controls" style={{ marginTop: 20, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="control-group">
          <label htmlFor="sort-select" style={{ marginRight: '0.5rem' }}>Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '4px' }}
          >
            <option value="category">Category</option>
            <option value="name">Parameter Name</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filter-select" style={{ marginRight: '0.5rem' }}>Filter:</label>
          <select
            id="filter-select"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '4px' }}
          >
            <option value="all">All Parameters</option>
            <option value="abnormal">Needs Attention</option>
            <option value="normal">Normal Only</option>
            <option value="high">High Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>

         <button
    className="btn-trends"
    style={{
      width: '100%',
      backgroundColor: showTrends ? '#2563eb' : '#3b82f6',
      color: '#fff',
      border: 'none',
      padding: '8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontWeight: '600',
      boxShadow: showTrends ? '0 0 8px #2563eb' : 'none',
      transition: 'background-color 0.3s ease',
      marginTop: '1rem',
    }}
    onClick={handleToggleTrends}
    aria-pressed={showTrends}
    aria-label={showTrends ? 'Hide Trends' : 'Show Trends'}
  >
    {showTrends ? '📈 Hide Trends' : '📊 Show Trends'}
  </button>
      </div>
    </div>

    <div className="parameters-display" style={{ marginTop: 24 }}>
      {Object.entries(groupedByCategory).map(([category, parameters]) => (
        <div key={category} className="category-section" style={{ marginBottom: 24 }}>
          <h3 className="category-title" style={{ color: '#1e293b', marginBottom: 12 }}>{category}</h3>

          <div className="parameters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {parameters.map((param, index) => {
              let cardStyle = {};
              let statusText = param.status;
              if (param.status === 'Normal') {
                cardStyle = { backgroundColor: '#d1fae5', border: '1px solid #065f46', color: '#065f46' };
              } else if (param.status === 'Needs Attention' || param.status === 'High' || param.status === 'Low') {
                cardStyle = { backgroundColor: '#fee2e2', border: '1px solid #991b1b', color: '#991b1b' };
              } else if (param.status === 'UNKNOWN') {
                cardStyle = { backgroundColor: '#fff7cd', border: '1px solid #92400e', color: '#92400e' };
                statusText = '❓ Data Unavailable';
              }

              return (
                <div key={index} className={`parameter-card`} style={{ padding: 16, borderRadius: 8, ...cardStyle }}>
                  <div className="parameter-header" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: 16 }}>
                    <span className="parameter-name">{param.name}</span>
                    <span className="status-icon">{getStatusIcon(param.status)}</span>
                  </div>

                  <div className="parameter-value" style={{ marginTop: 8, fontSize: 18, fontWeight: '600' }}>
                    <span className="value">{param.value}</span>
                    <span className="unit" style={{ marginLeft: 4, fontWeight: '400', color: '#475569' }}>{param.unit}</span>
                  </div>

                  <div className="parameter-range" style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>
                    Normal: {param.normalRange}
                  </div>

                  <div className="parameter-status" style={{ marginTop: 8, fontWeight: '600' }}>
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    {filteredAndSortedData.length === 0 && (
      <div className="no-results" style={{ marginTop: 24, textAlign: 'center', color: '#9ca3af' }}>
        <p>No parameters match the current filter.</p>
      </div>
    )}
  </div>
);


};

export default ReportTable;
