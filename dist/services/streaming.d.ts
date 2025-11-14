import { BodyLanguageFeatures } from '../types';
export interface StreamChunk {
    sessionId: string;
    questionIndex: number;
    chunkIndex: number;
    audioData?: Buffer;
    videoData?: Buffer;
    timestamp: number;
    isLast: boolean;
    transcript?: string;
}
export interface ProcessedChunk {
    questionIndex: number;
    transcript?: string;
    bodyLanguage?: BodyLanguageFeatures;
    vector?: number[];
    feedback?: {
        strengths: string[];
        areasForImprovement: string[];
        overallScore: number;
        detailedFeedback: string;
        suggestions: string[];
    };
    status: 'processing' | 'completed' | 'error';
    error?: string;
}
/**
 * Save streaming audio chunk to temporary file
 * Supports WebM (from browser) and converts to WAV for processing
 */
export declare function saveAudioChunk(sessionId: string, questionIndex: number, chunkIndex: number, audioData: Buffer): Promise<string>;
/**
 * Save streaming video chunk to temporary file
 */
export declare function saveVideoChunk(sessionId: string, questionIndex: number, chunkIndex: number, videoData: Buffer): Promise<string>;
/**
 * Combine audio chunks into a single file for transcription
 */
export declare function combineAudioChunks(sessionId: string, questionIndex: number, chunkPaths: string[]): Promise<string>;
/**
 * Process a streaming chunk in real-time
 */
export declare function processStreamChunk(chunk: StreamChunk, audioPath?: string, videoPath?: string): Promise<ProcessedChunk>;
/**
 * Cleanup temporary chunk files
 */
export declare function cleanupChunks(chunkPaths: string[]): Promise<void>;
//# sourceMappingURL=streaming.d.ts.map