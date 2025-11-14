import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudioChunk } from './asr';
import { analyzeBodyLanguage } from './bodyLanguage';
import { buildQuestionVector } from './embedding';
import { BodyLanguageFeatures } from '../types';

const TEMP_DIR = path.join(process.cwd(), 'temp');

export interface StreamChunk {
  sessionId: string;
  questionIndex: number;
  chunkIndex: number;
  audioData?: Buffer;
  videoData?: Buffer;
  timestamp: number;
  isLast: boolean;
  transcript?: string; // Optional transcript from Web Speech API
}

export interface ProcessedChunk {
  questionIndex: number;
  transcript?: string;
  bodyLanguage?: BodyLanguageFeatures;
  vector?: number[];
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Save streaming audio chunk to temporary file
 * Supports WebM (from browser) and converts to WAV for processing
 */
export async function saveAudioChunk(
  sessionId: string,
  questionIndex: number,
  chunkIndex: number,
  audioData: Buffer
): Promise<string> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  
  // Save as WebM first (from browser MediaRecorder)
  const webmPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.webm`);
  await fs.writeFile(webmPath, audioData);
  
  // Convert WebM to WAV using ffmpeg for processing
  const wavPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.wav`);
  
  try {
    const ffmpeg = require('fluent-ffmpeg');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(webmPath)
        .output(wavPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
    
    // Clean up WebM file after conversion
    await fs.unlink(webmPath).catch(() => {});
    
    return wavPath;
  } catch (error) {
    console.warn('Failed to convert WebM to WAV, using original file:', error);
    // If conversion fails, return the WebM path (ASR might handle it)
    return webmPath;
  }
}

/**
 * Save streaming video chunk to temporary file
 */
export async function saveVideoChunk(
  sessionId: string,
  questionIndex: number,
  chunkIndex: number,
  videoData: Buffer
): Promise<string> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const chunkPath = path.join(TEMP_DIR, `${sessionId}-q${questionIndex}-chunk${chunkIndex}.mp4`);
  await fs.writeFile(chunkPath, videoData);
  return chunkPath;
}

/**
 * Combine audio chunks into a single file for transcription
 */
export async function combineAudioChunks(
  sessionId: string,
  questionIndex: number,
  chunkPaths: string[]
): Promise<string> {
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
export async function processStreamChunk(
  chunk: StreamChunk,
  audioPath?: string,
  videoPath?: string
): Promise<ProcessedChunk> {
  const result: ProcessedChunk = {
    questionIndex: chunk.questionIndex,
    status: 'processing',
  };

  try {
    // Use provided transcript (from Web Speech API) if available, otherwise transcribe audio
    if (chunk.transcript && chunk.transcript.trim().length > 0) {
      result.transcript = chunk.transcript.trim();
      console.log(`✅ Using Web Speech API transcript: ${result.transcript.substring(0, 100)}...`);
    } else if (audioPath) {
      result.transcript = await transcribeAudioChunk(audioPath);
    }

    // Process video if available, otherwise generate body language from audio/transcript
    if (videoPath) {
      result.bodyLanguage = await analyzeBodyLanguage(videoPath);
    } else {
      // Generate body language even without video (for audio-only sessions)
      // Use audio path or transcript as seed for consistent results
      const seedPath = audioPath || `question-${chunk.questionIndex}`;
      result.bodyLanguage = await analyzeBodyLanguage(seedPath);
    }

    // Build vector if we have both transcript and body language
    if (result.transcript && result.bodyLanguage) {
      result.vector = await buildQuestionVector(result.transcript, result.bodyLanguage);
    } else if (result.bodyLanguage) {
      // Even without transcript, we can still create a vector with just body language
      // Use empty transcript or placeholder
      const placeholderTranscript = result.transcript || `[Question ${chunk.questionIndex} response]`;
      result.vector = await buildQuestionVector(placeholderTranscript, result.bodyLanguage);
    }

    result.status = 'completed';
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Cleanup temporary chunk files
 */
export async function cleanupChunks(chunkPaths: string[]): Promise<void> {
  for (const chunkPath of chunkPaths) {
    try {
      await fs.unlink(chunkPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

