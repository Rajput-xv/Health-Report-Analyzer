const mongoose = require('mongoose');

// Connect to MongoDB database
const connectDB = async () => {
  try {
    // Use a default MongoDB URI if not provided
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/health-analyzer';
    const conn = await mongoose.connect(mongoUri);

    console.log('MongoDB connected successfully');

    // Handle connection events for better monitoring
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown when app terminates
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Continuing without database connection...');
    // Don't exit the process, let the server run without database
  }
};

module.exports = connectDB;
