import { Server as SocketIOServer } from 'socket.io';
import { StreamChunk, ProcessedChunk } from './streaming';
export type { StreamChunk, ProcessedChunk };
export interface RealtimeSession {
    sessionId: string;
    questionIndex: number;
    audioChunks: Map<number, string>;
    videoChunks: Map<number, string>;
    currentChunkIndex: number;
    isProcessing: boolean;
    processedResults: Map<number, ProcessedChunk>;
}
/**
 * Create a new real-time session for streaming
 */
export declare function createRealtimeSession(sessionId: string, questionIndex: number): RealtimeSession;
/**
 * Get active real-time session
 */
export declare function getRealtimeSession(sessionId: string, questionIndex: number): RealtimeSession | null;
/**
 * Handle incoming stream chunk
 */
export declare function handleStreamChunk(chunk: StreamChunk, io: SocketIOServer): Promise<void>;
//# sourceMappingURL=realtimeSession.d.ts.map