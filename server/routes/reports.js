const express = require('express');
const { generateTrendData } = require('../utils/trendGenerator');
const authMiddleware = require('../utils/authMiddleware');
const Report = require('../models/Report');

const router = express.Router();

// Get all reports for authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id })
      .sort({ createdAt: -1 }) // Most recent first
      .select('-extractedText') // Exclude large text field for list view
      .lean(); // Convert to plain JavaScript objects

    res.json(reports);
  } catch (error) {
    console.error('Failed to fetch user reports');
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get specific report by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
      .select('-extractedText')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Failed to fetch report details');
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Get trend data for specific parameters
router.get('/:id/trends', authMiddleware, async (req, res) => {
  try {
    const currentReport = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!currentReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Generate trend data with dummy historical data
    const trendData = generateTrendData(currentReport.healthParameters);

    res.json(trendData);
  } catch (error) {
    console.error('Failed to generate trend data');
    res.status(500).json({ error: 'Failed to generate trend data' });
  }
});

// Delete a report
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete report');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
