/**
 * Speech-to-Text Service
 * Wraps the existing ASR logic for the orchestration API
 */
import { transcribeAudioChunk } from './asr';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = path.join(process.cwd(), 'temp');

/**
 * Transcribe audio from buffer or URL
 * @param audioBufferOrUrl - Audio buffer or URL to audio file
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBufferOrUrl: Buffer | string,
  providedTranscript?: string
): Promise<string> {
  // If transcript is provided, use it
  if (providedTranscript && providedTranscript.trim().length > 0) {
    console.log(`✅ Using provided transcript: ${providedTranscript.substring(0, 100)}...`);
    return providedTranscript;
  }

  try {
    let audioPath: string;
    let cleanupNeeded = false;

    if (typeof audioBufferOrUrl === 'string') {
      // If it's a URL, download it first (or use directly if it's a file path)
      if (audioBufferOrUrl.startsWith('http')) {
        // TODO: Download from URL if needed
        throw new Error('URL audio download not yet implemented');
      } else {
        audioPath = audioBufferOrUrl;
      }
    } else {
      // Save buffer to temp file (keep as webm for now, will convert if needed)
      await fs.mkdir(TEMP_DIR, { recursive: true });
      const tempId = uuidv4();
      audioPath = path.join(TEMP_DIR, `${tempId}.webm`);
      await fs.writeFile(audioPath, audioBufferOrUrl);
      cleanupNeeded = true;
      console.log(`💾 Saved audio buffer to ${audioPath} (${audioBufferOrUrl.length} bytes)`);
    }

    // Use existing transcribeAudioChunk function
    const transcript = await transcribeAudioChunk(audioPath);
    console.log(`✅ Transcription complete: "${transcript.substring(0, 100)}..."`);

    // Cleanup temp file if we created it
    if (cleanupNeeded) {
      try {
        await fs.unlink(audioPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return transcript;
  } catch (error) {
    console.error('STT error:', error);
    throw new Error(`Speech-to-text failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

