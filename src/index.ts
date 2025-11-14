import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as path from 'path';
import sessionsRouter from './routes/sessions';
import realtimeRouter from './routes/realtime';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5001;

// Middleware - CORS with permissive settings
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Remove restrictive CSP header that causes Chrome DevTools warnings
app.use((req, res, next) => {
  // Remove CSP header for all responses
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  next();
});

// Make io available to routes
app.set('io', io);

// API Routes (before static files)
app.use('/sessions', sessionsRouter);
app.use('/realtime', realtimeRouter(io));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle Chrome DevTools well-known endpoint
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).send();
});

// Root endpoint - serve UI
app.get('/', (req, res) => {
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  res.sendFile(htmlPath);
});

// Serve static files from public directory (after API routes)
app.use(express.static(path.join(process.cwd(), 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-session', (sessionId: string) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
    socket.emit('joined-session', { sessionId });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});


// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Mental Model Interview Coach API running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Sessions API: http://localhost:${PORT}/sessions`);
  console.log(`⚡ Real-time API: http://localhost:${PORT}/realtime`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});


