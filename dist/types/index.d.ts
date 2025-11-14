export type { BodyLanguageFeatures, FrameworkMatch, MindmapTree, MindmapDelta, MindmapAnalysis, GradingResult, QuestionResult, } from './shared';
import type { BodyLanguageFeatures } from './shared';
export interface Question {
    id: string;
    sessionId: string;
    index: number;
    startTs: number;
    endTs: number;
    transcript?: string;
    bodyLanguage?: BodyLanguageFeatures;
    vector?: number[];
}
export interface Session {
    id: string;
    mediaPath: string;
    questions: Question[];
    createdAt: Date;
    processedAt?: Date;
}
export interface QuestionVectorRecord {
    id: string;
    sessionId: string;
    questionIndex: number;
    vector: number[];
    bodyLanguage: BodyLanguageFeatures;
    transcript: string;
    createdAt: Date;
}
export interface CreateSessionRequest {
    mediaPath?: string;
    questions: Array<{
        index: number;
        startTs: number;
        endTs: number;
    }>;
}
//# sourceMappingURL=index.d.ts.map