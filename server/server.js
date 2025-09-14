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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Health Report Analyzer API is running!' });
});

app.listen(PORT, () => {
  // Server started successfully
  console.log(`Server is running on port ${PORT}`);
});
