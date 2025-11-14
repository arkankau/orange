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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAudioChunk = saveAudioChunk;
exports.saveVideoChunk = saveVideoChunk;
exports.combineAudioChunks = combineAudioChunks;
exports.processStreamChunk = processStreamChunk;
exports.cleanupChunks = cleanupChunks;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const asr_1 = require("./asr");
const bodyLanguage_1 = require("./bodyLanguage");
const embedding_1 = require("./embedding");
const feedback_1 = require("./feedback");
const TEMP_DIR = path.join(process.cwd(), 'temp');
/**
 * Save streaming audio chunk to temporary file
 * Supports WebM (from browser) and converts to WAV for processing
 */
async function saveAudioChunk(sessionId, questionIndex, chunkIndex, audioData) {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    // Save as WebM first (from browser MediaRecorder)
    const webmPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.webm`);
    await fs.writeFile(webmPath, audioData);
    // Convert WebM to WAV using ffmpeg for processing
    const wavPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.wav`);
    try {
        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
            ffmpeg(webmPath)
                .output(wavPath)
                .audioCodec('pcm_s16le')
                .audioChannels(1)
                .audioFrequency(16000)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });
        // Clean up WebM file after conversion
        await fs.unlink(webmPath).catch(() => { });
        return wavPath;
    }
    catch (error) {
        console.warn('Failed to convert WebM to WAV, using original file:', error);
        // If conversion fails, return the WebM path (ASR might handle it)
        return webmPath;
    }
}
/**
 * Save streaming video chunk to temporary file
 */
async function saveVideoChunk(sessionId, questionIndex, chunkIndex, videoData) {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const chunkPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.mp4`);
    await fs.writeFile(chunkPath, videoData);
    return chunkPath;
}
/**
 * Combine audio chunks into a single file for transcription
 */
async function combineAudioChunks(sessionId, questionIndex, chunkPaths) {
    const outputPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-combined.wav`);
    // For now, just use the first chunk or combine them
    // In production, you'd use ffmpeg to concatenate
    if (chunkPaths.length === 1) {
        return chunkPaths[0];
    }
    // TODO: Use ffmpeg to concatenate multiple chunks
    // For hackathon, we'll process the last chunk or combine all
    return chunkPaths[chunkPaths.length - 1];
}
/**
 * Process a streaming chunk in real-time
 */
async function processStreamChunk(chunk, audioPath, videoPath) {
    const result = {
        questionIndex: chunk.questionIndex,
        status: 'processing',
    };
    try {
        // Use provided transcript (from Web Speech API) if available, otherwise transcribe audio
        if (chunk.transcript && chunk.transcript.trim().length > 0) {
            result.transcript = chunk.transcript.trim();
            console.log(`✅ Using Web Speech API transcript: ${result.transcript.substring(0, 100)}...`);
        }
        else if (audioPath) {
            result.transcript = await (0, asr_1.transcribeAudioChunk)(audioPath);
        }
        // Process video if available, otherwise generate body language from audio/transcript
        if (videoPath) {
            result.bodyLanguage = await (0, bodyLanguage_1.analyzeBodyLanguage)(videoPath);
        }
        else {
            // Generate body language even without video (for audio-only sessions)
            // Use audio path or transcript as seed for consistent results
            const seedPath = audioPath || `question-${chunk.questionIndex}`;
            result.bodyLanguage = await (0, bodyLanguage_1.analyzeBodyLanguage)(seedPath);
        }
        // Build vector if we have both transcript and body language
        if (result.transcript && result.bodyLanguage) {
            result.vector = await (0, embedding_1.buildQuestionVector)(result.transcript, result.bodyLanguage);
            // Generate interview feedback using Claude
            console.log(`📝 Generating feedback for question ${chunk.questionIndex}...`);
            console.log(`   Transcript: "${result.transcript.substring(0, 100)}..."`);
            console.log(`   Body language metrics available: ${!!result.bodyLanguage}`);
            try {
                const feedback = await (0, feedback_1.generateInterviewFeedback)(result.transcript, result.bodyLanguage, chunk.questionIndex);
                result.feedback = {
                    strengths: feedback.strengths,
                    areasForImprovement: feedback.areasForImprovement,
                    overallScore: feedback.overallScore,
                    detailedFeedback: feedback.detailedFeedback,
                    suggestions: feedback.suggestions,
                };
                console.log(`✅ Feedback generated: Score ${feedback.overallScore}/100`);
                console.log(`   Strengths: ${feedback.strengths.length}, Improvements: ${feedback.areasForImprovement.length}`);
            }
            catch (error) {
                console.error('❌ Error generating feedback:', error);
                if (error instanceof Error) {
                    console.error('   Error details:', error.message);
                }
                // Generate fallback feedback so UI always has something to show
                console.log('   ⚠️ Using fallback feedback due to API error');
                // The generateInterviewFeedback function now always returns feedback,
                // so this catch block should rarely be hit, but just in case:
                result.feedback = {
                    strengths: ['Response provided'],
                    areasForImprovement: ['Continue practicing'],
                    overallScore: 60,
                    detailedFeedback: 'Feedback generation encountered an issue. Please try again.',
                    suggestions: ['Check your internet connection', 'Verify API key is set'],
                };
            }
        }
        else if (result.bodyLanguage) {
            // Even without transcript, we can still create a vector with just body language
            // Use empty transcript or placeholder
            const placeholderTranscript = result.transcript || `[Question ${chunk.questionIndex} response]`;
            result.vector = await (0, embedding_1.buildQuestionVector)(placeholderTranscript, result.bodyLanguage);
        }
        result.status = 'completed';
    }
    catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Unknown error';
    }
    return result;
}
/**
 * Cleanup temporary chunk files
 */
async function cleanupChunks(chunkPaths) {
    for (const chunkPath of chunkPaths) {
        try {
            await fs.unlink(chunkPath);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
}
//# sourceMappingURL=streaming.js.map