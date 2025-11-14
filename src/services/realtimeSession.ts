import { Session, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { createSession, getSession, updateSession } from '../stores/sessionStore';
import { saveQuestionVector } from '../stores/vectorStore';
import { StreamChunk, ProcessedChunk, saveAudioChunk, saveVideoChunk, combineAudioChunks, processStreamChunk, cleanupChunks } from './streaming';

// Re-export for convenience
export type { StreamChunk, ProcessedChunk };

export interface RealtimeSession {
  sessionId: string;
  questionIndex: number;
  audioChunks: Map<number, string>; // chunkIndex -> filePath
  videoChunks: Map<number, string>; // chunkIndex -> filePath
  currentChunkIndex: number;
  isProcessing: boolean;
  processedResults: Map<number, ProcessedChunk>; // questionIndex -> result
}

const activeSessions: Map<string, RealtimeSession> = new Map();

/**
 * Create a new real-time session for streaming
 */
export function createRealtimeSession(sessionId: string, questionIndex: number): RealtimeSession {
  const rtSession: RealtimeSession = {
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
export function getRealtimeSession(sessionId: string, questionIndex: number): RealtimeSession | null {
  const key = `${sessionId}-q${questionIndex}`;
  return activeSessions.get(key) || null;
}

/**
 * Handle incoming stream chunk
 */
export async function handleStreamChunk(
  chunk: StreamChunk,
  io: SocketIOServer
): Promise<void> {
  const key = `${chunk.sessionId}-q${chunk.questionIndex}`;
  let rtSession = activeSessions.get(key);

  if (!rtSession) {
    rtSession = createRealtimeSession(chunk.sessionId, chunk.questionIndex);
  }

  // Save chunks
  if (chunk.audioData) {
    const audioPath = await saveAudioChunk(
      chunk.sessionId,
      chunk.questionIndex,
      chunk.chunkIndex,
      chunk.audioData
    );
    rtSession.audioChunks.set(chunk.chunkIndex, audioPath);
  }

  if (chunk.videoData) {
    const videoPath = await saveVideoChunk(
      chunk.sessionId,
      chunk.questionIndex,
      chunk.chunkIndex,
      chunk.videoData
    );
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
        ? await combineAudioChunks(chunk.sessionId, chunk.questionIndex, audioPaths)
        : undefined;
      const combinedVideoPath = videoPaths.length > 0 ? videoPaths[videoPaths.length - 1] : undefined;

      // Pass the chunk with transcript to processing
      const result = await processStreamChunk(chunk, combinedAudioPath, combinedVideoPath);
      rtSession.processedResults.set(chunk.questionIndex, result);

      // Save to vector store if we have a complete result
      if (result.vector && result.transcript && result.bodyLanguage) {
        const session = await getSession(chunk.sessionId);
        if (session) {
          await saveQuestionVector({
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
            await updateSession(session);
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
      await cleanupChunks([...audioPaths, ...videoPaths]);
      if (combinedAudioPath && combinedAudioPath !== audioPaths[audioPaths.length - 1]) {
        await cleanupChunks([combinedAudioPath]);
      }
    } catch (error) {
      io.to(chunk.sessionId).emit('processing-error', {
        sessionId: chunk.sessionId,
        questionIndex: chunk.questionIndex,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      rtSession.isProcessing = false;
      activeSessions.delete(key);
    }
  }
}

