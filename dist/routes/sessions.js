"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionStore_1 = require("../stores/sessionStore");
const vectorStore_1 = require("../stores/vectorStore");
const media_1 = require("../services/media");
const asr_1 = require("../services/asr");
const bodyLanguage_1 = require("../services/bodyLanguage");
const embedding_1 = require("../services/embedding");
const router = (0, express_1.Router)();
/**
 * POST /sessions
 * Create a new session with media path and question boundaries
 */
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (!body.questions || !Array.isArray(body.questions)) {
            return res.status(400).json({
                error: 'Invalid request: questions array is required',
            });
        }
        // mediaPath is optional for real-time streaming sessions
        if (!body.mediaPath) {
            body.mediaPath = 'streaming://realtime';
        }
        const session = await (0, sessionStore_1.createSession)(body.mediaPath, body.questions);
        res.status(201).json(session);
    }
    catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});
/**
 * POST /sessions/:id/process
 * Process a session: extract segments, transcribe, analyze body language, create vectors
 */
router.post('/:id/process', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const session = await (0, sessionStore_1.getSession)(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        console.log(`Processing session ${sessionId} with ${session.questions.length} questions`);
        // Process each question
        for (const question of session.questions) {
            console.log(`Processing question ${question.index} (${question.startTs}s - ${question.endTs}s)`);
            try {
                // 1. Extract audio and video segments
                const { audioPath, videoPath } = await (0, media_1.extractSegment)(session.mediaPath, question.startTs, question.endTs);
                try {
                    // 2. Transcribe audio
                    const transcript = await (0, asr_1.transcribeAudioChunk)(audioPath);
                    question.transcript = transcript;
                    // 3. Analyze body language
                    const bodyLanguage = await (0, bodyLanguage_1.analyzeBodyLanguage)(videoPath);
                    question.bodyLanguage = bodyLanguage;
                    // 4. Build question vector
                    const vector = await (0, embedding_1.buildQuestionVector)(transcript, bodyLanguage);
                    question.vector = vector;
                    // 5. Save to vector store
                    await (0, vectorStore_1.saveQuestionVector)({
                        sessionId: session.id,
                        questionIndex: question.index,
                        vector,
                        bodyLanguage,
                        transcript,
                    });
                    console.log(`Question ${question.index} processed: transcript length=${transcript.length}, vector length=${vector.length}`);
                }
                finally {
                    // Cleanup temp files
                    await (0, media_1.cleanupSegment)(audioPath, videoPath);
                }
            }
            catch (error) {
                console.error(`Error processing question ${question.index}:`, error);
                // Continue with other questions even if one fails
            }
        }
        // Update session with processed timestamp
        session.processedAt = new Date();
        await (0, sessionStore_1.updateSession)(session);
        // Return updated session with summaries
        const response = {
            ...session,
            questions: session.questions.map((q) => ({
                ...q,
                vectorLength: q.vector?.length,
                transcriptLength: q.transcript?.length,
                // Don't send full vector in response (too large)
                vector: q.vector ? `[${q.vector.length} dimensions]` : undefined,
            })),
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error processing session:', error);
        res.status(500).json({ error: 'Failed to process session' });
    }
});
/**
 * GET /sessions/:id/vectors
 * Get all vectors for a session
 */
router.get('/:id/vectors', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const session = await (0, sessionStore_1.getSession)(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const vectors = await (0, vectorStore_1.getVectorsBySession)(sessionId);
        // Return summary without full vectors (too large for JSON response)
        const response = vectors.map((v) => ({
            questionIndex: v.questionIndex,
            vectorLength: v.vector.length,
            bodyLanguage: v.bodyLanguage,
            transcript: v.transcript,
            createdAt: v.createdAt,
        }));
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching vectors:', error);
        res.status(500).json({ error: 'Failed to fetch vectors' });
    }
});
/**
 * GET /sessions/:id
 * Get session details
 */
router.get('/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const session = await (0, sessionStore_1.getSession)(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map