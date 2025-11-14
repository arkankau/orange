"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createRealtimeRouter;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sessionStore_1 = require("../stores/sessionStore");
const realtimeSession_1 = require("../services/realtimeSession");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
function createRealtimeRouter(io) {
    const router = (0, express_1.Router)();
    /**
     * POST /realtime/sessions
     * Create a new real-time session for streaming
     */
    router.post('/sessions', async (req, res) => {
        try {
            const body = req.body;
            if (!body.questions || !Array.isArray(body.questions)) {
                return res.status(400).json({
                    error: 'Invalid request: questions array is required',
                });
            }
            // Create session (mediaPath optional for real-time)
            const session = await (0, sessionStore_1.createSession)(body.mediaPath || 'streaming://realtime', body.questions);
            res.status(201).json({
                ...session,
                realtime: true,
                websocketUrl: `ws://localhost:${process.env.PORT || 3000}`,
            });
        }
        catch (error) {
            console.error('Error creating real-time session:', error);
            res.status(500).json({ error: 'Failed to create real-time session' });
        }
    });
    /**
     * POST /realtime/sessions/:id/chunk
     * Receive a streaming chunk (audio/video) from Zoom or other source
     */
    router.post('/sessions/:sessionId/chunk', upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'video', maxCount: 1 },
    ]), async (req, res) => {
        try {
            const sessionId = req.params.sessionId;
            const { questionIndex, chunkIndex, timestamp, isLast, transcript } = req.body;
            if (!questionIndex || chunkIndex === undefined) {
                return res.status(400).json({
                    error: 'questionIndex and chunkIndex are required',
                });
            }
            const session = await (0, sessionStore_1.getSession)(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            const files = req.files;
            const audioFile = files?.audio?.[0];
            const videoFile = files?.video?.[0];
            if (!audioFile && !videoFile) {
                return res.status(400).json({
                    error: 'At least one of audio or video chunk is required',
                });
            }
            const chunk = {
                sessionId,
                questionIndex: parseInt(questionIndex),
                chunkIndex: parseInt(chunkIndex),
                audioData: audioFile?.buffer,
                videoData: videoFile?.buffer,
                timestamp: timestamp ? parseFloat(timestamp) : Date.now() / 1000,
                isLast: isLast === 'true' || isLast === true,
                transcript: transcript || undefined, // Include transcript from Web Speech API
            };
            // Handle the chunk (this will process and emit WebSocket events)
            await (0, realtimeSession_1.handleStreamChunk)(chunk, io);
            res.json({
                success: true,
                sessionId,
                questionIndex: chunk.questionIndex,
                chunkIndex: chunk.chunkIndex,
                message: 'Chunk received and queued for processing',
            });
        }
        catch (error) {
            console.error('Error handling stream chunk:', error);
            res.status(500).json({ error: 'Failed to process chunk' });
        }
    });
    /**
     * POST /realtime/sessions/:id/zoom-webhook
     * Webhook endpoint for Zoom events (recording started, chunk available, etc.)
     */
    router.post('/sessions/:sessionId/zoom-webhook', async (req, res) => {
        try {
            const sessionId = req.params.sessionId;
            const event = req.body;
            console.log('Zoom webhook received:', event.event);
            // Handle different Zoom events
            switch (event.event) {
                case 'recording.started':
                    io.to(sessionId).emit('recording-started', {
                        sessionId,
                        timestamp: new Date().toISOString(),
                    });
                    break;
                case 'recording.stopped':
                    io.to(sessionId).emit('recording-stopped', {
                        sessionId,
                        timestamp: new Date().toISOString(),
                    });
                    break;
                case 'recording.completed':
                    io.to(sessionId).emit('recording-completed', {
                        sessionId,
                        downloadUrl: event.payload?.object?.recording_files?.[0]?.download_url,
                        timestamp: new Date().toISOString(),
                    });
                    break;
                default:
                    console.log('Unhandled Zoom event:', event.event);
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error handling Zoom webhook:', error);
            res.status(500).json({ error: 'Failed to process webhook' });
        }
    });
    /**
     * GET /realtime/sessions/:id/status
     * Get real-time processing status for a session
     */
    router.get('/sessions/:sessionId/status', async (req, res) => {
        try {
            const sessionId = req.params.sessionId;
            const session = await (0, sessionStore_1.getSession)(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            // Get active connections for this session
            const room = io.sockets.adapter.rooms.get(sessionId);
            const activeConnections = room ? room.size : 0;
            res.json({
                sessionId,
                activeConnections,
                questions: session.questions.map((q) => ({
                    index: q.index,
                    hasTranscript: !!q.transcript,
                    hasBodyLanguage: !!q.bodyLanguage,
                    hasVector: !!q.vector,
                })),
            });
        }
        catch (error) {
            console.error('Error getting session status:', error);
            res.status(500).json({ error: 'Failed to get session status' });
        }
    });
    return router;
}
//# sourceMappingURL=realtime.js.map