import express from 'express';
import http from 'http';
import { WebSocketManager } from './websocket/WebSocketManager';
import { connectDB } from './config/database';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize WebSocket with specific path
new WebSocketManager(server, '/socket.io');

// Express middleware
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Sales Agent API' });
});
// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'OK' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
