/**
 * Transcribe audio chunk using Anthropic Claude API
 * For hackathon: Uses Claude to generate realistic transcriptions based on audio characteristics
 * In production, you'd use a dedicated ASR service or Claude's audio API when available
 * @param audioPath Path to the audio file
 * @returns Transcribed text
 */
export declare function transcribeAudioChunk(audioPath: string): Promise<string>;
//# sourceMappingURL=asr.d.ts.map