import { BodyLanguageFeatures } from '../types';
/**
 * Get text embedding using Anthropic Claude API
 * Since Anthropic doesn't have a direct embeddings API, we use Claude to generate
 * a structured representation and convert it to a numerical vector
 *
 * @param text Text to embed
 * @returns Embedding vector
 */
export declare function getTextEmbedding(text: string): Promise<number[]>;
/**
 * Normalize and scale body language features to match embedding dimensions
 * @param body Body language features
 * @returns Normalized feature vector
 */
export declare function normalizeBodyLanguageFeatures(body: BodyLanguageFeatures): number[];
/**
 * Build a feature vector by concatenating text embedding with normalized body language features
 * @param embedding Text embedding vector
 * @param body Body language features
 * @returns Combined feature vector
 */
export declare function buildFeatureVector(embedding: number[], body: BodyLanguageFeatures): number[];
/**
 * Build a complete question vector from transcript and body language
 * @param transcript Text transcript
 * @param body Body language features
 * @returns Combined feature vector
 */
export declare function buildQuestionVector(transcript: string, body: BodyLanguageFeatures): Promise<number[]>;
//# sourceMappingURL=embedding.d.ts.map