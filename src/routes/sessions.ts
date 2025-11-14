import { Router, Request, Response } from 'express';
import { createSession, getSession, updateSession } from '../stores/sessionStore';
import { saveQuestionVector, getVectorsBySession } from '../stores/vectorStore';
import { extractSegment, cleanupSegment } from '../services/media';
import { transcribeAudioChunk } from '../services/asr';
import { analyzeBodyLanguage } from '../services/bodyLanguage';
import { buildQuestionVector } from '../services/embedding';
import { CreateSessionRequest, Session } from '../types';

const router = Router();

/**
 * POST /sessions
 * Create a new session with media path and question boundaries
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body: CreateSessionRequest = req.body;

    // questions is optional - can create empty session for real-time
    if (!body.questions) {
      body.questions = [];
    }

    if (!Array.isArray(body.questions)) {
      return res.status(400).json({
        error: 'Invalid request: questions must be an array',
      });
    }

    // mediaPath is optional for real-time streaming sessions
    if (!body.mediaPath) {
      body.mediaPath = 'streaming://realtime';
    }

    const session = await createSession(body.mediaPath, body.questions);

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * POST /sessions/:id/process
 * Process a session: extract segments, transcribe, analyze body language, create vectors
 */
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`Processing session ${sessionId} with ${session.questions.length} questions`);

    // Process each question
    for (const question of session.questions) {
      console.log(`Processing question ${question.index} (${question.startTs}s - ${question.endTs}s)`);

      try {
        // 1. Extract audio and video segments
        const { audioPath, videoPath } = await extractSegment(
          session.mediaPath,
          question.startTs,
          question.endTs
        );

        try {
          // 2. Transcribe audio
          const transcript = await transcribeAudioChunk(audioPath);
          question.transcript = transcript;

          // 3. Analyze body language
          const bodyLanguage = await analyzeBodyLanguage(videoPath);
          question.bodyLanguage = bodyLanguage;

          // 4. Build question vector
          const vector = await buildQuestionVector(transcript, bodyLanguage);
          question.vector = vector;

          // 5. Save to vector store
          await saveQuestionVector({
            sessionId: session.id,
            questionIndex: question.index,
            vector,
            bodyLanguage,
            transcript,
          });

          console.log(
            `Question ${question.index} processed: transcript length=${transcript.length}, vector length=${vector.length}`
          );
        } finally {
          // Cleanup temp files
          await cleanupSegment(audioPath, videoPath);
        }
      } catch (error) {
        console.error(`Error processing question ${question.index}:`, error);
        // Continue with other questions even if one fails
      }
    }

    // Update session with processed timestamp
    session.processedAt = new Date();
    await updateSession(session);

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
  } catch (error) {
    console.error('Error processing session:', error);
    res.status(500).json({ error: 'Failed to process session' });
  }
});

/**
 * GET /sessions/:id/vectors
 * Get all vectors for a session
 */
router.get('/:id/vectors', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const vectors = await getVectorsBySession(sessionId);

    // Return summary without full vectors (too large for JSON response)
    const response = vectors.map((v) => ({
      questionIndex: v.questionIndex,
      vectorLength: v.vector.length,
      bodyLanguage: v.bodyLanguage,
      transcript: v.transcript,
      createdAt: v.createdAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching vectors:', error);
    res.status(500).json({ error: 'Failed to fetch vectors' });
  }
});

/**
 * GET /sessions/:id
 * Get session details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;


