const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Connect to MongoDB database
const connectDB = async () => {
  try {
    // First try to connect to real MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI);
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
      if (mongoServer) {
        await mongoServer.stop();
      }
      console.log('MongoDB connection closed');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Trying to start in-memory MongoDB for testing...');
    
    try {
      // Start in-memory MongoDB server
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoUri);
      console.log('✅ In-memory MongoDB connected successfully for testing!');
      console.log('📝 Note: Data will not persist between server restarts');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('In-memory MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('In-memory MongoDB disconnected');
      });

    } catch (memoryError) {
      console.error('Failed to start in-memory database:', memoryError.message);
      console.log('Server will continue without database connection (limited functionality)');
    }
  }
};

module.exports = connectDB;
