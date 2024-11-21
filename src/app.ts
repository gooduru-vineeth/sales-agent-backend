import express from 'express';
import http from 'http';
import { WebSocketManager } from './websocket/WebSocketManager';
import { connectDB } from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize WebSocket
new WebSocketManager(server);

// Express middleware
app.use(express.json());

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 