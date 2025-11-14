import { BodyLanguageFeatures } from '../types';
/**
 * Analyze body language from video segment
 * For hackathon MVP: returns bounded pseudo-random values with clear TODOs for real models
 *
 * TODO: Integrate with a real CV pipeline:
 * - Use face detection (e.g., MediaPipe Face Mesh) for eye contact estimation
 * - Use pose estimation (e.g., MediaPipe Pose) for gesture and posture analysis
 * - Use emotion recognition models for affect/warmth
 * - Use confidence/competence estimation models
 *
 * @param videoPath Path to the video segment
 * @returns Body language features
 */
export declare function analyzeBodyLanguage(videoPath: string): Promise<BodyLanguageFeatures>;
//# sourceMappingURL=bodyLanguage.d.ts.map