/**
 * Questions Analysis Route
 * Orchestrates STT, mental model analysis, and grading
 */
import express, { Request, Response } from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/stt';
import { analyzeMentalModel } from '../services/mentalModel';
import { gradeAnswer } from '../services/grading';
import { BodyLanguageFeatures, QuestionResult } from '../types/shared';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

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
router.post(
  '/sessions/:sessionId/questions/:questionIndex/analyze',
  upload.single('audio'),
  async (req: Request, res: Response) => {
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
      let bodyLanguage: BodyLanguageFeatures;
      if (req.body.bodyLanguage) {
        try {
          bodyLanguage = typeof req.body.bodyLanguage === 'string'
            ? JSON.parse(req.body.bodyLanguage)
            : req.body.bodyLanguage;
        } catch (e) {
          bodyLanguage = {
            warmth: 0.5,
            competence: 0.5,
            affect: 0.5,
          };
        }
      } else {
        bodyLanguage = {
          warmth: 0.5,
          competence: 0.5,
          affect: 0.5,
        };
      }

      console.log(`🔍 Analyzing question ${questionIndexNum} for session ${sessionId}`);

      // Step 1: Transcribe audio (or use provided transcript)
      let transcript: string;
      const providedTranscript = req.body.transcript?.trim();
      
      if (providedTranscript && providedTranscript.length > 0) {
        transcript = providedTranscript;
        console.log(`✅ Using provided transcript (${transcript.length} chars)`);
      } else if (audio) {
        console.log(`🎤 Transcribing audio... (size: ${req.file?.size || (audio as Buffer).length} bytes)`);
        try {
          transcript = await transcribeAudio(audio as Buffer | string, providedTranscript);
          console.log(`✅ Transcription complete: "${transcript.substring(0, 100)}..."`);
        } catch (error) {
          console.error('❌ Transcription error:', error);
          return res.status(500).json({ 
            error: 'Transcription failed', 
            details: error instanceof Error ? error.message : String(error) 
          });
        }
      } else {
        return res.status(400).json({ error: 'No audio or transcript provided' });
      }

      // Step 2: Analyze mental model (framework matching + mind map)
      console.log('🧠 Analyzing mental model...');
      const { framework, mindmap } = await analyzeMentalModel(transcript, bodyLanguage);

      // Step 3: Grade the answer
      console.log('📊 Grading answer...');
      const grading = await gradeAnswer(transcript, mindmap, bodyLanguage, framework.name);

      // Step 4: Build unified result
      const result: QuestionResult = {
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
    } catch (err) {
      console.error('❌ Analysis error:', err);
      res.status(500).json({
        error: 'Analysis failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

export default router;

