import { BodyLanguageFeatures, FrameworkMatch, MindmapAnalysis } from '../types/shared';
/**
 * Analyze mental model - main entry point
 */
export declare function analyzeMentalModel(transcript: string, bodyLanguage: BodyLanguageFeatures): Promise<{
    framework: FrameworkMatch;
    mindmap: MindmapAnalysis;
}>;
//# sourceMappingURL=mentalModel.d.ts.map