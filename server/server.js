const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();

// Initialize database connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// Set server timeout to 5 minutes for OCR processing
app.timeout = 300000;

// Configure CORS for frontend communication
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://health-report-analyzer.vercel.app', 'https://health-report-analyzer.onrender.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
};

app.use(cors(corsOptions));

// Ensure Express handles large payloads for OCR images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analysis', require('./routes/analysis'));


// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbConnected = mongoose.connection.readyState === 1;

  res.json({
    message: 'Health Report Analyzer API is running!',
    database: dbConnected ? 'Connected' : 'Disconnected',
    features: {
      fileUpload: true,
      ocr: true,
      authentication: dbConnected,
      reportSaving: dbConnected
    }
  });
});

//Centralized error handler 
// app.use((err, req, res, next) => {
//   console.error("Server error:",err);
//   res.status(500).json({ error:err.message|| 'Internal Server Error' });
// });
app.listen(PORT, () => {
  // Server started successfully
  console.log(`Server is running on port ${PORT}`);
});
