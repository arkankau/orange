import { BodyLanguageFeatures } from '../types';
export interface InterviewFeedback {
    transcript: string;
    bodyLanguage: BodyLanguageFeatures;
    strengths: string[];
    areasForImprovement: string[];
    overallScore: number;
    detailedFeedback: string;
    suggestions: string[];
}
/**
 * Generate interview feedback using Claude API
 * Analyzes transcript and body language to provide actionable feedback
 */
export declare function generateInterviewFeedback(transcript: string, bodyLanguage: BodyLanguageFeatures, questionIndex: number): Promise<InterviewFeedback>;
//# sourceMappingURL=feedback.d.ts.map