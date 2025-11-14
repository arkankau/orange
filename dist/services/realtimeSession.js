"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRealtimeSession = createRealtimeSession;
exports.getRealtimeSession = getRealtimeSession;
exports.handleStreamChunk = handleStreamChunk;
const sessionStore_1 = require("../stores/sessionStore");
const vectorStore_1 = require("../stores/vectorStore");
const streaming_1 = require("./streaming");
const activeSessions = new Map();
/**
 * Create a new real-time session for streaming
 */
function createRealtimeSession(sessionId, questionIndex) {
    const rtSession = {
        sessionId,
        questionIndex,
        audioChunks: new Map(),
        videoChunks: new Map(),
        currentChunkIndex: 0,
        isProcessing: false,
        processedResults: new Map(),
    };
    const key = `${sessionId}-q${questionIndex}`;
    activeSessions.set(key, rtSession);
    return rtSession;
}
/**
 * Get active real-time session
 */
function getRealtimeSession(sessionId, questionIndex) {
    const key = `${sessionId}-q${questionIndex}`;
    return activeSessions.get(key) || null;
}
/**
 * Handle incoming stream chunk
 */
async function handleStreamChunk(chunk, io) {
    const key = `${chunk.sessionId}-q${chunk.questionIndex}`;
    let rtSession = activeSessions.get(key);
    if (!rtSession) {
        rtSession = createRealtimeSession(chunk.sessionId, chunk.questionIndex);
    }
    // Save chunks
    if (chunk.audioData) {
        const audioPath = await (0, streaming_1.saveAudioChunk)(chunk.sessionId, chunk.questionIndex, chunk.chunkIndex, chunk.audioData);
        rtSession.audioChunks.set(chunk.chunkIndex, audioPath);
    }
    if (chunk.videoData) {
        const videoPath = await (0, streaming_1.saveVideoChunk)(chunk.sessionId, chunk.questionIndex, chunk.chunkIndex, chunk.videoData);
        rtSession.videoChunks.set(chunk.chunkIndex, videoPath);
    }
    // Emit progress update
    io.to(chunk.sessionId).emit('chunk-received', {
        sessionId: chunk.sessionId,
        questionIndex: chunk.questionIndex,
        chunkIndex: chunk.chunkIndex,
        timestamp: chunk.timestamp,
    });
    // If this is the last chunk, process the question
    if (chunk.isLast && !rtSession.isProcessing) {
        rtSession.isProcessing = true;
        io.to(chunk.sessionId).emit('processing-started', {
            sessionId: chunk.sessionId,
            questionIndex: chunk.questionIndex,
        });
        // Process the question
        try {
            const audioPaths = Array.from(rtSession.audioChunks.values());
            const videoPaths = Array.from(rtSession.videoChunks.values());
            const combinedAudioPath = audioPaths.length > 0
                ? await (0, streaming_1.combineAudioChunks)(chunk.sessionId, chunk.questionIndex, audioPaths)
                : undefined;
            const combinedVideoPath = videoPaths.length > 0 ? videoPaths[videoPaths.length - 1] : undefined;
            // Pass the chunk with transcript to processing
            const result = await (0, streaming_1.processStreamChunk)(chunk, combinedAudioPath, combinedVideoPath);
            rtSession.processedResults.set(chunk.questionIndex, result);
            // Save to vector store if we have a complete result
            if (result.vector && result.transcript && result.bodyLanguage) {
                const session = await (0, sessionStore_1.getSession)(chunk.sessionId);
                if (session) {
                    await (0, vectorStore_1.saveQuestionVector)({
                        sessionId: chunk.sessionId,
                        questionIndex: chunk.questionIndex,
                        vector: result.vector,
                        bodyLanguage: result.bodyLanguage,
                        transcript: result.transcript,
                    });
                    // Update session question
                    const question = session.questions.find(q => q.index === chunk.questionIndex);
                    if (question) {
                        question.transcript = result.transcript;
                        question.bodyLanguage = result.bodyLanguage;
                        question.vector = result.vector;
                        await (0, sessionStore_1.updateSession)(session);
                    }
                }
            }
            // Emit completion
            io.to(chunk.sessionId).emit('question-processed', {
                sessionId: chunk.sessionId,
                questionIndex: chunk.questionIndex,
                result,
            });
            // Cleanup
            await (0, streaming_1.cleanupChunks)([...audioPaths, ...videoPaths]);
            if (combinedAudioPath && combinedAudioPath !== audioPaths[audioPaths.length - 1]) {
                await (0, streaming_1.cleanupChunks)([combinedAudioPath]);
            }
        }
        catch (error) {
            io.to(chunk.sessionId).emit('processing-error', {
                sessionId: chunk.sessionId,
                questionIndex: chunk.questionIndex,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        finally {
            rtSession.isProcessing = false;
            activeSessions.delete(key);
        }
    }
}
//# sourceMappingURL=realtimeSession.js.map