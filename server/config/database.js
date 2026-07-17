const mongoose = require('mongoose');

let mongoServer;

// Close the DB cleanly on Ctrl+C
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error during shutdown:', err.message);
  } finally {
    process.exit(0);
  }
});

// Connect to MongoDB database
const connectDB = async () => {
  try {
    // First try to connect to real MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Handle connection events for better monitoring
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);

    // Only fall back to the throwaway in-memory DB during tests. In prod we'd rather
    // crash and let the host restart us than silently lose data to an ephemeral DB.
    if (process.env.NODE_ENV !== 'test') {
      console.error('Not starting with an in-memory database outside tests. Exiting.');
      throw error;
    }

    console.log('Starting in-memory MongoDB for testing...');
    try {
      // Only load this dev dependency when we actually need it
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();

      await mongoose.connect(mongoUri);
      console.log('✅ In-memory MongoDB connected successfully for testing!');
      console.log('📝 Note: Data will not persist between server restarts');

      mongoose.connection.on('error', (err) => {
        console.error('In-memory MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('In-memory MongoDB disconnected');
      });

    } catch (memoryError) {
      console.error('Failed to start in-memory database:', memoryError.message);
      throw memoryError;
    }
  }
};

module.exports = connectDB;
