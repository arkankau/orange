"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Questions Analysis Route
 * Orchestrates STT, mental model analysis, and grading
 */
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const stt_1 = require("../services/stt");
const mentalModel_1 = require("../services/mentalModel");
const grading_1 = require("../services/grading");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = express_1.default.Router();
/**
 * POST /sessions/:sessionId/questions/:questionIndex/analyze
 *
 * Analyzes a question response:
 * 1. Transcribes audio
 * 2. Matches framework and generates mind map
 * 3. Grades the answer
 *
 * Returns unified QuestionResult
 */
router.post('/sessions/:sessionId/questions/:questionIndex/analyze', upload.single('audio'), async (req, res) => {
    try {
        const { sessionId, questionIndex } = req.params;
        const questionIndexNum = parseInt(questionIndex, 10);
        if (isNaN(questionIndexNum)) {
            return res.status(400).json({ error: 'Invalid question index' });
        }
        // Get audio from file upload or body
        const audio = req.file?.buffer || req.body.audioUrl;
        if (!audio && !req.body.transcript) {
            return res.status(400).json({ error: 'Audio or transcript required' });
        }
        // Get body language from request body
        let bodyLanguage;
        if (req.body.bodyLanguage) {
            try {
                bodyLanguage = typeof req.body.bodyLanguage === 'string'
                    ? JSON.parse(req.body.bodyLanguage)
                    : req.body.bodyLanguage;
            }
            catch (e) {
                bodyLanguage = {
                    warmth: 0.5,
                    competence: 0.5,
                    affect: 0.5,
                };
            }
        }
        else {
            bodyLanguage = {
                warmth: 0.5,
                competence: 0.5,
                affect: 0.5,
            };
        }
        console.log(`🔍 Analyzing question ${questionIndexNum} for session ${sessionId}`);
        // Step 1: Transcribe audio (or use provided transcript)
        let transcript;
        if (req.body.transcript && req.body.transcript.trim()) {
            transcript = req.body.transcript.trim();
            console.log(`✅ Using provided transcript (${transcript.length} chars)`);
        }
        else if (audio) {
            console.log('🎤 Transcribing audio...');
            transcript = await (0, stt_1.transcribeAudio)(audio);
            console.log(`✅ Transcription complete (${transcript.length} chars)`);
        }
        else {
            return res.status(400).json({ error: 'No audio or transcript provided' });
        }
        // Step 2: Analyze mental model (framework matching + mind map)
        console.log('🧠 Analyzing mental model...');
        const { framework, mindmap } = await (0, mentalModel_1.analyzeMentalModel)(transcript, bodyLanguage);
        // Step 3: Grade the answer
        console.log('📊 Grading answer...');
        const grading = await (0, grading_1.gradeAnswer)(transcript, mindmap, bodyLanguage, framework.name);
        // Step 4: Build unified result
        const result = {
            sessionId,
            questionIndex: questionIndexNum,
            transcript,
            frameworkMatch: framework,
            mindmap,
            grading,
            bodyLanguage,
        };
        console.log(`✅ Analysis complete for question ${questionIndexNum}`);
        console.log(`   Framework: ${framework.name} (${framework.score})`);
        console.log(`   Scores: Structure=${grading.structureScore}, Insight=${grading.insightScore}, Communication=${grading.communicationScore}`);
        res.json(result);
    }
    catch (err) {
        console.error('❌ Analysis error:', err);
        res.status(500).json({
            error: 'Analysis failed',
            message: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map