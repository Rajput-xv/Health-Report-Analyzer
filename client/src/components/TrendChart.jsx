import React, { useState, useEffect } from 'react';

const TrendChart = ({ data, reportId }) => {
  // Use a function here so Object.keys doesn't run on null data (it would throw)
  const [selectedParameter, setSelectedParameter] = useState(() =>
    data && typeof data === 'object' ? Object.keys(data)[0] : undefined
  );

  // When the data changes (e.g. a different report), pick a valid parameter again
  useEffect(() => {
    const keys = data && typeof data === 'object' ? Object.keys(data) : [];
    setSelectedParameter((prev) => (keys.includes(prev) ? prev : keys[0]));
  }, [data]);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="trend-chart-container">
        <p>No trend data available.</p>
      </div>
    );
  }

  const currentTrend = data[selectedParameter];

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'caution': return '🔻';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getInsightClass = (type) => {
    return `insight-${type}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Normal': return 'trend-normal';
      case 'High': return 'trend-high';
      case 'Low': return 'trend-low';
      default: return 'trend-unknown';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'Increasing': return '📈';
      case 'Decreasing': return '📉';
      case 'Stable': return '➡️';
      default: return '📊';
    }
  };

  return (
    <div className="trend-chart-container">
      <div className="trend-header">
        <h3>📈 Trend Analysis</h3>
        <div className="parameter-selector">
          <label htmlFor="param-select" style={{ marginRight: '0.5rem' }}>Select Parameter:</label>
          <select 
            id="param-select"
            value={selectedParameter} 
            onChange={(e) => setSelectedParameter(e.target.value)}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '4px' }}
          >
            {Object.keys(data).map(param => (
              <option key={param} value={param}>{param}</option>
            ))}
          </select>
        </div>
      </div>

      {currentTrend && (
        <div className="trend-content">
          <div className="trend-summary">
            <div className="trend-info">
              <h4>{currentTrend.parameter}</h4>
              <div className="trend-direction">
                <span className="trend-icon">{getTrendIcon(currentTrend.trend)}</span>
                <span className="trend-text">{currentTrend.trend} Trend</span>
              </div>
            </div>
            <div className="trend-range">
              Normal Range: <strong>{currentTrend.normalRange} {currentTrend.unit}</strong>
            </div>
          </div>

          <div className="trend-chart">
            <div className="chart-area">
              <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span>📅 6-Month Trend</span>
                <span className="chart-unit" style={{ fontWeight: '600', color: '#555' }}>({currentTrend.unit})</span>
              </div>

              <div className="chart-points" style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
                {currentTrend.data.map((point, index) => {
                  const statusClass = getStatusClass(point.status);
                  // Uppercase so 'High'/'Low' from the API match the checks below
                  const normalizedStatus = (point.status || '').toString().toUpperCase();
                  let bgColor = '#d1e7dd'; // default normal: greenish
                  let textColor = '#0f5132';

                  if (normalizedStatus === 'HIGH') {
                    bgColor = '#f8d7da'; // reddish background
                    textColor = '#842029';
                  } else if (normalizedStatus === 'LOW') {
                    bgColor = '#cff4fc'; // light blue background
                    textColor = '#055160';
                  } else if (normalizedStatus === 'UNKNOWN') {
                    bgColor = '#fff3cd'; // yellow background
                    textColor = '#664d03';
                  }

                  return (
                    <div key={index} className="chart-point-container" style={{ textAlign: 'center', minWidth: 40 }}>
                      <div
                        className={`chart-point ${statusClass}`}
                        title={`${point.value} ${currentTrend.unit} - ${point.status}`}
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          lineHeight: '36px',
                          fontWeight: '700',
                          cursor: 'default',
                          boxShadow: '0 0 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div className="point-value">{point.value}</div>
                      </div>
                      <div className="point-date" style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                        {formatDate(point.date)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="chart-line" style={{ marginTop: 16 }}>
                <svg width="100%" height="4" aria-hidden="true" focusable="false">
                  <line
                    x1="0%"
                    y1="2"
                    x2="100%"
                    y2="2"
                    stroke="#e0e0e0"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="trend-insights" style={{ marginTop: 24 }}>
            <h4>🔍 Insights & Recommendations</h4>
            <div className="insights-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentTrend.insights && currentTrend.insights.length > 0 ? (
                currentTrend.insights.map((insight, index) => {
                  let bgColor = '#e7f3fe'; // info blue default
                  let icon = 'ℹ️';

                  if (insight.type === 'warning') {
                    bgColor = '#fff4e5'; // amber background
                    icon = '⚠️';
                  } else if (insight.type === 'critical') {
                    bgColor = '#f8d7da'; // red/pink background
                    icon = '❗';
                  } else if (insight.type === 'success') {
                    bgColor = '#d1e7dd'; // green background
                    icon = '✅';
                  }

                  return (
                    <div
                      key={index}
                      className={`insight-card insight-${insight.type}`}
                      style={{
                        backgroundColor: bgColor,
                        padding: '10px 14px',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#333',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <span className="insight-icon" aria-label={`${insight.type} icon`} role="img" style={{ fontSize: 20 }}>
                        {icon}
                      </span>
                      <span className="insight-message">{insight.message}</span>
                    </div>
                  );
                })
              ) : (
                <div
                  className="insight-card insight-info"
                  style={{
                    backgroundColor: '#e7f3fe',
                    padding: '10px 14px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#333',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <span className="insight-icon" role="img" aria-label="info icon" style={{ fontSize: 20 }}>
                    📋
                  </span>
                  <span className="insight-message">No specific insights available for this parameter.</span>
                </div>
              )}
            </div>
          </div>

          <div
            className="trend-disclaimer"
            style={{ marginTop: 24, fontSize: 12, color: '#7a7a7a', fontStyle: 'italic' }}
          >
            <p>
              ⚠️ <strong>Disclaimer:</strong> Trend data includes simulated historical values for demonstration purposes. Always consult with healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
