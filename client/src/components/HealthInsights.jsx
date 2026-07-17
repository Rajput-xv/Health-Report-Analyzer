import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useTranslation } from 'react-i18next';
import api, { getHealthSummary, compareReports } from '../utils/api';
import Header from './Header';
import Footer from './Footer';
import '../styles/Insights.css';

export default function HealthInsights({ user, setUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState('');
  const [cmpA, setCmpA] = useState('');
  const [cmpB, setCmpB] = useState('');
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [rRes, sRes] = await Promise.all([api.get('/reports'), getHealthSummary()]);
        if (!alive) return;
        const list = Array.isArray(rRes.data) ? [...rRes.data] : [];
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // oldest first for trends
        setReports(list);
        setSummary(sRes);
      } catch (e) {
        console.error('Failed to load insights:', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isNumeric = (p) =>
    (p.parameterType ? p.parameterType === 'numeric' : typeof p.value === 'number') &&
    Number.isFinite(Number(p.value));

  const paramNames = Array.from(new Set(
    reports.flatMap((r) => (r.healthParameters || []).filter(isNumeric).map((p) => p.name))
  )).sort();

  useEffect(() => {
    if (!selectedParam && paramNames.length) setSelectedParam(paramNames[0]);
  }, [paramNames, selectedParam]);

  const series = reports
    .map((r) => {
      const p = (r.healthParameters || []).find((x) => x.name === selectedParam);
      return p && Number.isFinite(Number(p.value))
        ? { date: r.createdAt, value: Number(p.value) }
        : null;
    })
    .filter(Boolean);

  const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const axisColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.08)';

  const chartData = {
    labels: series.map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [{
      label: selectedParam,
      data: series.map((s) => s.value),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: axisColor } } },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor }, grid: { color: gridColor } },
    },
  };

  const runCompare = async () => {
    if (!cmpA || !cmpB || cmpA === cmpB) return;
    setComparing(true);
    const res = await compareReports(cmpA, cmpB);
    setComparison(res && Array.isArray(res.changes) ? res : { changes: [] });
    setComparing(false);
  };

  return (
    <>
      <Header user={user} setUser={setUser} />
      <main className="insights-page">
        <h1 className="insights-title">{t('insights.title')}</h1>
        <p className="insights-subtitle">{t('insights.subtitle')}</p>

        {loading ? (
          <p className="insights-muted">{t('insights.loading')}</p>
        ) : reports.length === 0 ? (
          <div className="insights-empty">
            <p>{t('insights.no_reports')}</p>
            <button className="insights-btn" onClick={() => navigate('/dashboard')}>
              {t('insights.go_upload')}
            </button>
          </div>
        ) : (
          <>
            {summary?.hasReports && summary.summary && (
              <section className="insights-card">
                <h2>{t('insights.summary_title')}</h2>
                <div className="insights-stats">
                  <div className="insights-stat">
                    <span>{summary.summary.totalReports}</span>
                    <label>{t('insights.total_reports')}</label>
                  </div>
                  <div className="insights-stat">
                    <span>{summary.summary.totalParameters}</span>
                    <label>{t('insights.total_parameters')}</label>
                  </div>
                  <div className="insights-stat">
                    <span>{summary.summary.overallRisk}</span>
                    <label>{t('insights.overall_risk')}</label>
                  </div>
                </div>
                {summary.summary.persistentOutliers?.length > 0 && (
                  <div className="insights-outliers">
                    <strong>{t('insights.persistent_outliers')}</strong>
                    <ul>
                      {summary.summary.persistentOutliers.map((o, i) => (
                        <li key={i}>{o.parameter} ({o.occurrences}×)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {paramNames.length > 0 && (
              <section className="insights-card">
                <div className="insights-card-head">
                  <h2>{t('insights.trend_title')}</h2>
                  <select value={selectedParam} onChange={(e) => setSelectedParam(e.target.value)}>
                    {paramNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {series.length >= 2 ? (
                  <div className="insights-chart">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <p className="insights-muted">{t('insights.need_more_points')}</p>
                )}
              </section>
            )}

            {reports.length >= 2 && (
              <section className="insights-card">
                <h2>{t('insights.compare_title')}</h2>
                <div className="insights-compare-controls">
                  <select value={cmpA} onChange={(e) => setCmpA(e.target.value)}>
                    <option value="">{t('insights.select_report')}</option>
                    {reports.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.filename} - {new Date(r.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <select value={cmpB} onChange={(e) => setCmpB(e.target.value)}>
                    <option value="">{t('insights.select_report')}</option>
                    {reports.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.filename} - {new Date(r.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <button
                    className="insights-btn"
                    onClick={runCompare}
                    disabled={comparing || !cmpA || !cmpB || cmpA === cmpB}
                  >
                    {comparing ? t('insights.comparing') : t('insights.compare')}
                  </button>
                </div>

                {comparison && (
                  comparison.changes.length === 0 ? (
                    <p className="insights-muted">{t('insights.no_common')}</p>
                  ) : (
                    <div className="insights-table-wrap">
                      <table className="insights-table">
                        <thead>
                          <tr>
                            <th>{t('insights.parameter')}</th>
                            <th>{t('insights.old')}</th>
                            <th>{t('insights.new')}</th>
                            <th>{t('insights.change')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.changes.map((c, i) => (
                            <tr key={i}>
                              <td>{c.parameter}</td>
                              <td>{c.oldValue} {c.unit}</td>
                              <td>{c.newValue} {c.unit}</td>
                              <td className={c.trend === 'increased' ? 'up' : c.trend === 'decreased' ? 'down' : ''}>
                                {c.percentChange != null ? `${c.percentChange}%` : '-'}{' '}
                                {c.trend === 'increased' ? '↑' : c.trend === 'decreased' ? '↓' : '→'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
