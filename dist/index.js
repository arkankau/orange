"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path = __importStar(require("path"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const realtime_1 = __importDefault(require("./routes/realtime"));
const questions_1 = __importDefault(require("./routes/questions"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 5001;
// Middleware - CORS with permissive settings
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.raw({ type: 'application/octet-stream', limit: '50mb' }));
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
app.use('/sessions', sessions_1.default);
app.use('/realtime', (0, realtime_1.default)(io));
app.use('/api', questions_1.default);
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
app.use(express_1.default.static(path.join(process.cwd(), 'public')));
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('join-session', (sessionId) => {
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
//# sourceMappingURL=index.js.map