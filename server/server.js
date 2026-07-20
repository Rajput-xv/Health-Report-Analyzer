const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
require('dotenv').config();

// Initialize database connection. Outside of tests, a failed connection is fatal
// (connectDB rejects) so the process exits and the orchestrator can restart/retry
// instead of silently running on an ephemeral database.
connectDB().catch((err) => {
  console.error('Fatal: could not establish a database connection.', err.message);
  process.exit(1);
}); 

const app = express();
const PORT = process.env.PORT || 5001;

// Needed so rate-limit and req.ip see the real client IP behind Render/Vercel
app.set('trust proxy', 1);

// Security headers (the browser CSP is set on the client host, not here)
app.use(helmet({ contentSecurityPolicy: false }));

// Set server timeout to 5 minutes for OCR processing
app.timeout = 300000;

// Basic rate limit across the whole API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api', globalLimiter);

// Configure CORS for frontend communication
const corsOptions = {
	origin: process.env.NODE_ENV === 'production'
		? ['https://health-report-analyzer.vercel.app', 'https://health-report-analyzer-client.vercel.app', 'https://health-report-analyzer-backend.onrender.com', 'https://health-report-analyzer.onrender.com']
		: ['http://localhost:3000', 'http://localhost:5173'],
	credentials: true
};

app.use(cors(corsOptions));

// IMPORTANT: Gumroad webhook needs urlencoded body BEFORE express.json middleware
// The payments route handles its own body parsing for the webhook endpoint
app.use('/api/payments/webhook', express.urlencoded({ extended: true }));

// Ensure Express handles large payloads for OCR images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/contact', require('./routes/contact'));


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

// Centralized error handler 
app.use((err, req, res, next) => {
	console.error("Server error:", err);
	res.status(500).json({
		error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
	});
});
app.listen(PORT, () => {
	// Server started successfully
	console.log(`Server is running on port ${PORT}`);
});
