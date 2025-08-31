const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();

// Initialize database connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// Increase server timeout for OCR processing (5 minutes)
app.timeout = 600000;

// Configure CORS for frontend communication
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://health-report-analyzer.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/contact', require('./routes/contact'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Health Report Analyzer API is running!' });
});

app.listen(PORT, () => {
  // Server started successfully
  console.log(`Server is running on port ${PORT}`);
});
