/**
 * Extract audio and video segments from a media file for a given time range.
 * @param mediaPath Path to the source media file
 * @param startTs Start time in seconds
 * @param endTs End time in seconds
 * @returns Paths to the extracted audio and video segment files
 */
export declare function extractSegment(mediaPath: string, startTs: number, endTs: number): Promise<{
    audioPath: string;
    videoPath: string;
}>;
/**
 * Clean up temporary segment files
 */
export declare function cleanupSegment(audioPath: string, videoPath: string): Promise<void>;
//# sourceMappingURL=media.d.ts.map