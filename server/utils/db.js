const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI from environment variables.
 * Exits the process if the connection cannot be established, since the
 * app is fully dependent on persistence (Edge Case 3: browser refresh / data persistence).
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('FATAL: MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 8 no longer needs useNewUrlParser/useUnifiedTopology, kept here as no-ops
      // for clarity if downgrading is ever needed.
    });

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Mongoose will attempt to reconnect automatically.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });
  } catch (err) {
    console.error('FATAL: Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
