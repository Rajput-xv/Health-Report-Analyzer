const express = require('express');
const authMiddleware = require('../utils/authMiddleware');
const Report = require('../models/Report');
const { reanalyzeReport, generateTrendAnalysis } = require('../services/geminiService');

const router = express.Router();

/**
 * POST /api/analysis/:reportId/regenerate
 * Regenerate AI insights for an existing report
 * Useful for: updating old reports, getting fresh insights, or when Gemini wasn't used initially
 */
router.post('/:reportId/regenerate', authMiddleware, async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.reportId,
            userId: req.user.id
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Check if report has parameters to analyze
        if (!report.healthParameters || report.healthParameters.length === 0) {
            return res.status(400).json({
                error: 'Cannot analyze report with no health parameters',
                suggestion: 'Please add parameters manually first'
            });
        }

        console.log(`🔄 Re-analyzing report ${report._id} with Gemini...`);

        // Use Gemini to regenerate insights
        const analysisResult = await reanalyzeReport(report);

        if (!analysisResult.success) {
            return res.status(500).json({
                error: 'Failed to regenerate insights',
                details: analysisResult.error
            });
        }

        // Update report with new insights
        report.aiInsights = analysisResult.insights;
        report.insightsRegeneratedAt = new Date();

        await report.save();

        console.log(`✅ Insights regenerated for report ${report._id}`);

        res.json({
            success: true,
            reportId: report._id,
            insights: analysisResult.insights,
            regeneratedAt: report.insightsRegeneratedAt
        });

    } catch (error) {
        console.error('Failed to regenerate insights:', error);
        res.status(500).json({
            error: 'Failed to regenerate insights',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/analysis/:reportId/insights
 * Get detailed insights for a specific report
 */
router.get('/:reportId/insights', authMiddleware, async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.reportId,
            userId: req.user.id
        }).lean();

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // If no insights exist, suggest regeneration
        if (!report.aiInsights) {
            return res.json({
                hasInsights: false,
                message: 'No insights available. Use /regenerate endpoint to generate them.',
                reportId: report._id,
                parameterCount: report.healthParameters.length
            });
        }

        res.json({
            hasInsights: true,
            reportId: report._id,
            insights: report.aiInsights,
            generatedAt: report.aiInsights.generatedAt,
            regeneratedAt: report.insightsRegeneratedAt,
            extractionMethod: report.extractionMethod
        });

    } catch (error) {
        console.error('Failed to get insights:', error);
        res.status(500).json({ error: 'Failed to get insights' });
    }
});

/**
 * POST /api/analysis/trends
 * Generate trend analysis across multiple reports
 * Body: { reportIds: [id1, id2, ...] } or leave empty for all user reports
 */
router.post('/trends', authMiddleware, async (req, res) => {
    try {
        let reports;

        if (req.body.reportIds && req.body.reportIds.length > 0) {
            // Analyze specific reports
            reports = await Report.find({
                _id: { $in: req.body.reportIds },
                userId: req.user.id
            })
                .sort({ createdAt: 1 }) // Oldest first for trend analysis
                .lean();
        } else {
            // Analyze all user reports
            reports = await Report.find({ userId: req.user.id })
                .sort({ createdAt: 1 })
                .lean();
        }

        if (reports.length < 2) {
            return res.status(400).json({
                error: 'Need at least 2 reports for trend analysis',
                reportCount: reports.length
            });
        }

        console.log(`📊 Generating trend analysis for ${reports.length} reports...`);

        // Use Gemini to analyze trends
        const trendResult = await generateTrendAnalysis(reports);

        if (!trendResult.success) {
            return res.status(500).json({
                error: 'Failed to generate trend analysis',
                details: trendResult.error
            });
        }

        res.json({
            success: true,
            reportCount: reports.length,
            dateRange: trendResult.dateRange,
            analysis: trendResult.analysis
        });

    } catch (error) {
        console.error('Failed to generate trend analysis:', error);
        res.status(500).json({
            error: 'Failed to generate trend analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/analysis/summary
 * Get overall health summary for user based on all reports
 */
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const reports = await Report.find({
            userId: req.user.id,
            'healthParameters.0': { $exists: true } // Only reports with parameters
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        if (reports.length === 0) {
            return res.json({
                hasReports: false,
                message: 'No reports available for analysis'
            });
        }

        // Calculate summary statistics
        const latestReport = reports[0];
        const totalParameters = reports.reduce((sum, r) => sum + r.healthParameters.length, 0);
        const reportsWithInsights = reports.filter(r => r.aiInsights).length;

        // Get all outliers from reports with insights
        const allOutliers = reports
            .filter(r => r.aiInsights?.outliers)
            .flatMap(r => r.aiInsights.outliers);

        // Get high-risk parameters (appearing multiple times as outliers)
        const outlierFrequency = {};
        allOutliers.forEach(o => {
            outlierFrequency[o.parameter] = (outlierFrequency[o.parameter] || 0) + 1;
        });

        const persistentOutliers = Object.entries(outlierFrequency)
            .filter(([_, count]) => count >= 2)
            .map(([param, count]) => ({ parameter: param, occurrences: count }));

        // Risk assessment
        const highRiskCount = reports.filter(r => r.aiInsights?.riskLevel === 'High').length;
        const overallRisk = highRiskCount > 0 ? 'High' :
            allOutliers.length > 5 ? 'Moderate' : 'Low';

        res.json({
            hasReports: true,
            summary: {
                totalReports: reports.length,
                latestReportDate: latestReport.createdAt,
                totalParameters: totalParameters,
                reportsWithInsights: reportsWithInsights,
                overallRisk: overallRisk,
                persistentOutliers: persistentOutliers,
                latestOutliers: latestReport.aiInsights?.outliers || [],
                latestRecommendations: latestReport.aiInsights?.recommendations || []
            },
            latestReport: {
                id: latestReport._id,
                date: latestReport.createdAt,
                parameterCount: latestReport.healthParameters.length,
                riskLevel: latestReport.aiInsights?.riskLevel,
                extractionMethod: latestReport.extractionMethod
            }
        });

    } catch (error) {
        console.error('Failed to generate summary:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

/**
 * GET /api/analysis/compare
 * Compare two specific reports
 * Query: ?report1=id&report2=id
 */
router.get('/compare', authMiddleware, async (req, res) => {
    try {
        const { report1, report2 } = req.query;

        if (!report1 || !report2) {
            return res.status(400).json({
                error: 'Please provide both report IDs',
                example: '/api/analysis/compare?report1=id1&report2=id2'
            });
        }

        const reports = await Report.find({
            _id: { $in: [report1, report2] },
            userId: req.user.id
        })
            .sort({ createdAt: 1 })
            .lean();

        if (reports.length !== 2) {
            return res.status(404).json({ error: 'One or both reports not found' });
        }

        // Compare parameters
        const [older, newer] = reports;
        const comparison = {
            olderReport: {
                id: older._id,
                date: older.createdAt,
                parameterCount: older.healthParameters.length
            },
            newerReport: {
                id: newer._id,
                date: newer.createdAt,
                parameterCount: newer.healthParameters.length
            },
            changes: []
        };

        // Find common parameters and calculate changes
        older.healthParameters.forEach(oldParam => {
            const newParam = newer.healthParameters.find(p =>
                p.name.toLowerCase() === oldParam.name.toLowerCase()
            );

            if (newParam) {
                const change = newParam.value - oldParam.value;
                const percentChange = ((change / oldParam.value) * 100).toFixed(1);

                comparison.changes.push({
                    parameter: oldParam.name,
                    oldValue: oldParam.value,
                    newValue: newParam.value,
                    change: change,
                    percentChange: parseFloat(percentChange),
                    unit: oldParam.unit,
                    trend: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable',
                    statusChange: {
                        old: oldParam.status,
                        new: newParam.status,
                        improved: (oldParam.status !== 'Normal' && newParam.status === 'Normal')
                    }
                });
            }
        });

        // Sort by absolute change
        comparison.changes.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

        res.json(comparison);

    } catch (error) {
        console.error('Failed to compare reports:', error);
        res.status(500).json({ error: 'Failed to compare reports' });
    }
});

module.exports = router;