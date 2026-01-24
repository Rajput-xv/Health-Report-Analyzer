const express = require('express');
const User = require('../models/User');
const Report = require('../models/Report');

const router = express.Router();

// Public stats endpoint: total users and reports
router.get('/', async (req, res) => {
  try {
    const [userCount, reportCount] = await Promise.all([
      User.countDocuments({}),
      Report.countDocuments({})
    ]);
    res.json({
      totalUsers: userCount,
      totalReports: reportCount
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;