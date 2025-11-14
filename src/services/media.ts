import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
async function ensureTempDir(): Promise<void> {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

/**
 * Extract audio and video segments from a media file for a given time range.
 * @param mediaPath Path to the source media file
 * @param startTs Start time in seconds
 * @param endTs End time in seconds
 * @returns Paths to the extracted audio and video segment files
 */
export async function extractSegment(
  mediaPath: string,
  startTs: number,
  endTs: number
): Promise<{ audioPath: string; videoPath: string }> {
  await ensureTempDir();

  const duration = endTs - startTs;
  const segmentId = uuidv4();
  const audioPath = path.join(TEMP_DIR, `${segmentId}.wav`);
  const videoPath = path.join(TEMP_DIR, `${segmentId}.mp4`);

  // Extract audio segment
  await new Promise<void>((resolve, reject) => {
    ffmpeg(mediaPath)
      .setStartTime(startTs)
      .setDuration(duration)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  // Extract video segment
  await new Promise<void>((resolve, reject) => {
    ffmpeg(mediaPath)
      .setStartTime(startTs)
      .setDuration(duration)
      .output(videoPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  return { audioPath, videoPath };
}

/**
 * Clean up temporary segment files
 */
export async function cleanupSegment(audioPath: string, videoPath: string): Promise<void> {
  try {
    await fs.unlink(audioPath);
    await fs.unlink(videoPath);
  } catch (error) {
    console.warn(`Failed to cleanup segment files: ${error}`);
  }
}


