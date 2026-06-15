require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./utils/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const initSocket = require('./sockets/socketHandler');

const patientRoutes = require('./routes/patientRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const PORT = process.env.PORT || 5000;

// Parse comma-separated allowed origins for CORS / Socket.IO
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server, mobile apps)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  // Helps clients (Edge Case 4) reconnect cleanly
  pingTimeout: 30000,
  pingInterval: 25000,
});

// Make `io` available to controllers via req.app.get('io')
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Health check (useful for Render deployment health checks)
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "QueueCure '26 API is running.",
    endpoints: ['/health', '/api/patients', '/api/settings', '/api/analytics'],
  });
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.IO event handlers
initSocket(io);

// Connect to DB then start server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`QueueCure '26 server listening on port ${PORT}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});

module.exports = { app, io };
